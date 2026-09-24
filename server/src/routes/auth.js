import { Router } from 'express';
import User from '../models/User.js';
import Shelter from '../models/Shelter.js';
import { protect, signToken } from '../middleware/auth.js';
import { h } from '../utils/h.js';

const r = Router();
const clean = (u) => { const o = u.toObject(); delete o.password; return o; };

r.post('/register', h(async (req, res) => {
  const { name, email, password, role, phone, address, location, vehicleCapacityKg, orgName, shelter } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!['donor', 'shelter', 'driver'].includes(role)) return res.status(400).json({ message: 'Choose donor, shelter or driver' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const user = await User.create({ name, email, password, role, phone, address, location, orgName, vehicleCapacityKg: role === 'driver' ? vehicleCapacityKg || 50 : undefined });
  if (role === 'shelter')
    await Shelter.create({ owner: user._id, name: orgName || name, address, phone, location, capacityKg: shelter?.capacityKg || 100, ...(shelter?.acceptedTypes?.length ? { acceptedTypes: shelter.acceptedTypes } : {}) });
  res.status(201).json({ token: signToken(user), user: clean(user) });
}));

r.post('/login', h(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matches(req.body.password || ''))) return res.status(401).json({ message: 'Wrong email or password' });
  res.json({ token: signToken(user), user: clean(user) });
}));

r.get('/me', protect, (req, res) => res.json({ user: clean(req.user) }));

r.patch('/me', protect, h(async (req, res) => {
  for (const k of ['name', 'phone', 'address', 'location', 'isAvailable', 'vehicleCapacityKg'])
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  await req.user.save();
  res.json({ user: clean(req.user) });
}));
export default r;
