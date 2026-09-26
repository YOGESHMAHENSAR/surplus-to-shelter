import { Router } from 'express';
import User from '../models/User.js';
import Shelter from '../models/Shelter.js';
import { protect, signToken } from '../middleware/auth.js';
import { h } from '../utils/h.js';
import { documentUpload, documentFields, documentsDir } from '../middleware/documentUpload.js';
import path from 'node:path';

const r = Router();
const clean = (u) => { const o = u.toObject(); delete o.password; return o; };

r.post('/register', documentUpload, h(async (req, res) => {
  const { name, email, password, role, phone, address, location, vehicleCapacityKg, orgName, shelter, fssaiCert, ngoCert, driverLicense, verificationProof } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (!['donor', 'shelter', 'driver'].includes(role)) return res.status(400).json({ message: 'Choose donor, shelter or driver' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'That email is already registered' });
  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    address,
    location,
    orgName,
    fssaiCert,
    ngoCert,
    driverLicense,
    verificationProof,
    vehicleCapacityKg: role === 'driver' ? vehicleCapacityKg || 50 : undefined
  });
  req.documentsSaved = true;
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

r.get('/me/documents/:field', protect, (req, res) => {
  const field = req.params.field;
  const stored = documentFields.includes(field) ? req.user[field] : null;
  if (!stored?.startsWith('/uploads/documents/')) return res.status(404).json({ message: 'Document not found' });
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.basename(stored), { root: documentsDir });
});

r.patch('/me', protect, documentUpload, h(async (req, res) => {
  for (const k of ['name', 'phone', 'address', 'location', 'isAvailable', 'vehicleCapacityKg', 'fssaiCert', 'ngoCert', 'driverLicense', 'verificationProof', 'orgName'])
    if (req.body[k] !== undefined) req.user[k] = req.body[k];
  await req.user.save();
  req.documentsSaved = true;
  res.json({ user: clean(req.user) });
}));
export default r;
