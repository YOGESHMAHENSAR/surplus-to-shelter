import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import Donation from '../models/Donation.js';
import { FOOD_TYPES } from '../models/Shelter.js';
import { authMiddleware as protect, requireRole } from '../middleware/authMiddleware.js';
import { upload, uploadMemory } from '../middleware/uploadMiddleware.js';
import { classifyImage } from '../services/classifier.js';
import { matchDonation } from '../services/matching.js';
import { dispatch } from '../services/dispatch.js';
import { announce } from '../services/notify.js';
import { h } from '../utils/h.js';

const r = Router();
const UNIT_KG = { kg: 1, lb: 0.4536, g: 0.001, servings: 0.4, items: 0.5 };
const populate = [{ path: 'match.shelter', select: 'name address location' }, { path: 'driver', select: 'name phone' }];

// AI/CV classification (detects food type & estimated weight from a photo)
// Uses disk storage so segment_density.py can access the file
r.post('/classify', protect, requireRole('donor'), upload.single('photo'), h(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Attach a photo' });
  try {
    const filePath = path.resolve(req.file.path || '');
    const result = await classifyImage(filePath, req.file.mimetype);
    // Clean up temporary file after classification
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.json(result);
  } catch (error) {
    // Clean up on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    throw error;
  }
}));

// Run matching (+ dispatch on success) and persist the outcome
async function runPipeline(d) {
  const m = await matchDonation(d);
  if (!m.ok) {
    d.status = 'rejected'; d.rejectReason = m.reason;
    d.timeline.push({ status: 'rejected', note: m.reason });
    return d.save();
  }
  d.match = { shelter: m.shelter._id, distanceKm: m.distanceKm, score: m.score, riskScore: m.safety.riskScore, hoursLeft: m.safety.hoursLeft };
  d.rejectReason = undefined; d.status = 'matched';
  d.timeline.push({ status: 'matched', note: `Matched with ${m.shelter.name} (${m.distanceKm} km)` });
  await d.save();
  await dispatch(d._id);
}

r.post('/', protect, requireRole('donor'), upload.single('photo'), h(async (req, res) => {
  const b = req.body;
  const weight = Number(b.weight), lat = Number(b.pickupLat), lng = Number(b.pickupLng);
  if (!b.itemName || !(weight > 0) || !b.expiresAt || Number.isNaN(lat) || Number.isNaN(lng))
    return res.status(400).json({ message: 'Item name, weight, pickup location and expiry time are required' });
  if (!FOOD_TYPES.includes(b.foodType)) return res.status(400).json({ message: 'Unknown food type' });
  if (new Date(b.expiresAt) <= new Date()) return res.status(400).json({ message: 'Expiry time must be in the future' });

  let photoUrl;
  if (req.file) {
    // File already saved by uploadMiddleware to uploads directory
    const fileName = path.basename(req.file.path);
    photoUrl = `/uploads/${fileName}`;
  }
  const d = await Donation.create({
    donor: req.user._id, itemName: b.itemName, foodType: b.foodType, quantity: b.quantity,
    weightKg: +(weight * (UNIT_KG[b.unit] ?? 1)).toFixed(2), photoUrl,
    classificationMethod: b.classificationMethod === 'ai' ? 'ai' : 'manual', aiConfidence: b.aiConfidence ? Number(b.aiConfidence) : undefined,
    pickup: { lat, lng, address: b.pickupAddress }, expiresAt: b.expiresAt,
    timeline: [{ status: 'submitted', note: 'Donation submitted' }],
  });
  await runPipeline(d);
  res.status(201).json(await Donation.findById(d._id).populate(populate));
}));

// Rejected -> re-evaluate (e.g. after shelters free space or expiry is corrected)
r.post('/:id/reevaluate', protect, requireRole('donor'), h(async (req, res) => {
  const d = await Donation.findOne({ _id: req.params.id, donor: req.user._id, status: { $in: ['rejected', 'unassigned'] } });
  if (!d) return res.status(404).json({ message: 'Nothing to re-evaluate' });
  if (req.body.expiresAt) d.expiresAt = req.body.expiresAt;
  await runPipeline(d);
  res.json(await Donation.findById(d._id).populate(populate));
}));

r.get('/mine', protect, requireRole('donor'), h(async (req, res) =>
  res.json(await Donation.find({ donor: req.user._id }).sort('-createdAt').populate(populate).select('-proof.data'))));

r.get('/:id', protect, h(async (req, res) => {
  const d = await Donation.findById(req.params.id).populate(populate).populate('donor', 'name');
  if (!d) return res.status(404).json({ message: 'Donation not found' });
  res.json(d);
}));
export default r;
