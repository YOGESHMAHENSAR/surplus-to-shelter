import { Router } from 'express';
import Donation from '../models/Donation.js';
import { protect, requireRole } from '../middleware/auth.js';
import { optimizeRoute } from '../utils/geo.js';
import { announce } from '../services/notify.js';
import { h } from '../utils/h.js';

const r = Router();
r.use(protect, requireRole('driver'));

const ACTIVE = ['accepted', 'at_donor', 'picked_up', 'at_shelter'];
const pop = [{ path: 'match.shelter', select: 'name address location phone' }, { path: 'donor', select: 'name phone' }];

r.get('/jobs/open', h(async (req, res) =>
  res.json(await Donation.find({ status: 'dispatching', notifiedDrivers: req.user._id }).populate(pop).select('-proof.data'))));

r.get('/jobs/active', h(async (req, res) =>
  res.json(await Donation.find({ driver: req.user._id, status: { $in: ACTIVE } }).populate(pop).select('-proof.data'))));

r.get('/jobs/history', h(async (req, res) =>
  res.json(await Donation.find({ driver: req.user._id, status: 'delivered' }).sort('-deliveredAt').limit(20).populate(pop).select('-proof.data'))));

// Multi-stop optimised route across all active jobs
r.get('/jobs/route', h(async (req, res) => {
  const jobs = await Donation.find({ driver: req.user._id, status: { $in: ACTIVE } }).populate('match.shelter');
  if (!req.user.location?.lat) return res.status(400).json({ message: 'Set your location first' });
  res.json(optimizeRoute(req.user.location, jobs));
}));

// Driver accepts pickup (atomic: first driver wins) + vehicle-capacity check
r.post('/jobs/:id/accept', h(async (req, res) => {
  const active = await Donation.find({ driver: req.user._id, status: { $in: ACTIVE } });
  const load = active.reduce((s, j) => s + j.weightKg, 0);
  const d0 = await Donation.findById(req.params.id);
  if (!d0) return res.status(404).json({ message: 'Job not found' });
  if (load + d0.weightKg > req.user.vehicleCapacityKg)
    return res.status(409).json({ message: `Over vehicle capacity (${load + d0.weightKg} of ${req.user.vehicleCapacityKg} kg)` });
  const d = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: 'dispatching', notifiedDrivers: req.user._id },
    { $set: { status: 'accepted', driver: req.user._id }, $push: { timeline: { status: 'accepted', note: `Accepted by ${req.user.name}` } } },
    { new: true }).populate(pop);
  if (!d) return res.status(409).json({ message: 'Another driver already took this pickup' });
  await announce(d);
  res.json(d);
}));

const FLOW = {
  arrive_donor: ['accepted', 'at_donor', 'Driver arrived at donor'],
  pickup: ['at_donor', 'picked_up', 'Pickup confirmed'],
  arrive_shelter: ['picked_up', 'at_shelter', 'Driver arrived at shelter'],
  deliver: ['at_shelter', 'delivered', 'Delivered and confirmed'],
};
r.post('/jobs/:id/:action', h(async (req, res) => {
  const f = FLOW[req.params.action];
  if (!f) return res.status(400).json({ message: 'Unknown action' });
  const set = { status: f[1] };
  if (f[1] === 'delivered') {
    const { type, data, receivedBy } = req.body;
    if (!data || !['signature', 'photo'].includes(type)) return res.status(400).json({ message: 'Add a signature or photo as proof of delivery' });
    set.proof = { type, data, receivedBy, at: new Date() };
    set.deliveredAt = new Date();
  }
  const d = await Donation.findOneAndUpdate(
    { _id: req.params.id, driver: req.user._id, status: f[0] },
    { $set: set, $push: { timeline: { status: f[1], note: f[2] } } }, { new: true }).populate(pop);
  if (!d) return res.status(409).json({ message: `Job must be "${f[0].replace('_', ' ')}" first` });
  await announce(d);
  res.json(d);
}));
export default r;
