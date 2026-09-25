import { Router } from 'express';
import Shelter from '../models/Shelter.js';
import Donation from '../models/Donation.js';
import { protect, requireRole } from '../middleware/auth.js';
import { h } from '../utils/h.js';

const r = Router();
r.get('/', protect, h(async (req, res) => res.json(await Shelter.find({ active: true }))));

r.get('/mine', protect, requireRole('shelter'), h(async (req, res) => res.json(await Shelter.findOne({ owner: req.user._id }))));

r.patch('/mine', protect, requireRole('shelter'), h(async (req, res) => {
  const s = await Shelter.findOne({ owner: req.user._id });
  for (const k of ['name', 'address', 'phone', 'location', 'capacityKg', 'reservedKg', 'acceptedTypes', 'needs', 'active'])
    if (req.body[k] !== undefined) s[k] = req.body[k];
  await s.save();
  res.json(s);
}));

// Donations reserved for / headed to this shelter
r.get('/mine/incoming', protect, requireRole('shelter'), h(async (req, res) => {
  const s = await Shelter.findOne({ owner: req.user._id });
  res.json(await Donation.find({ 'match.shelter': s._id, status: { $nin: ['rejected', 'expired'] } })
    .sort('-createdAt').populate('driver', 'name phone').populate('donor', 'name').select('-proof.data'));
}));
export default r;
