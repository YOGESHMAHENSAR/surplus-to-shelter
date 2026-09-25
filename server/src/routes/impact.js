import { Router } from 'express';
import Donation from '../models/Donation.js';
import Shelter from '../models/Shelter.js';
import { protect, requireRole } from '../middleware/auth.js';
import { h } from '../utils/h.js';

const r = Router();
const KG_PER_MEAL = 0.5;      // ~1.2 lb of food per meal
const CO2E_PER_KG = 2.5;      // kg CO2e avoided per kg of food kept out of landfill (approx.)
const fmv = () => Number(process.env.FMV_USD_PER_KG) || 4.25;

async function scope(user) {
  if (user.role === 'donor') return { donor: user._id };
  if (user.role === 'driver') return { driver: user._id };
  if (user.role === 'shelter') { const s = await Shelter.findOne({ owner: user._id }); return { 'match.shelter': s?._id }; }
  return {};
}

// Data analytics engine: processes transaction logs -> impact dashboard numbers
r.get('/summary', protect, h(async (req, res) => {
  const q = await scope(req.user);
  const all = await Donation.find(q).select('-proof.data');
  const delivered = all.filter((d) => d.status === 'delivered');
  const wasted = all.filter((d) => ['expired', 'unassigned', 'rejected'].includes(d.status));
  const sum = (a) => a.reduce((s, d) => s + d.weightKg, 0);
  const kg = sum(delivered);
  const monthly = {}, byType = {};
  delivered.forEach((d) => {
    const m = (d.deliveredAt || d.updatedAt).toISOString().slice(0, 7);
    monthly[m] = (monthly[m] || 0) + d.weightKg;
    byType[d.foodType] = (byType[d.foodType] || 0) + d.weightKg;
  });
  res.json({
    totals: { donations: all.length, delivered: delivered.length, weightKg: +kg.toFixed(1), meals: Math.round(kg / KG_PER_MEAL),
      co2eKg: +(kg * CO2E_PER_KG).toFixed(1), wastedKg: +sum(wasted).toFixed(1), fmvUsd: +(kg * fmv()).toFixed(2) },
    monthly: Object.entries(monthly).sort().map(([month, w]) => ({ month, weightKg: +w.toFixed(1), meals: Math.round(w / KG_PER_MEAL) })),
    byType: Object.entries(byType).map(([type, w]) => ({ type, weightKg: +w.toFixed(1) })),
  });
}));

// Waste hotspot mapping: ~1 km grid cells with the most food that failed to reach a shelter
r.get('/hotspots', protect, requireRole('admin', 'donor'), h(async (req, res) => {
  const q = req.user.role === 'donor' ? { donor: req.user._id } : {};
  const all = await Donation.find(q).select('pickup weightKg status');
  const cells = {};
  all.forEach((d) => {
    const k = `${d.pickup.lat.toFixed(2)},${d.pickup.lng.toFixed(2)}`;
    const c = (cells[k] ||= { lat: +d.pickup.lat.toFixed(2), lng: +d.pickup.lng.toFixed(2), donations: 0, rescuedKg: 0, wastedKg: 0 });
    c.donations++;
    if (d.status === 'delivered') c.rescuedKg += d.weightKg;
    if (['expired', 'unassigned', 'rejected'].includes(d.status)) c.wastedKg += d.weightKg;
  });
  res.json(Object.values(cells).sort((a, b) => b.wastedKg - a.wastedKg).slice(0, 15));
}));

// Donor tax documentation
r.get('/tax-receipt', protect, requireRole('donor'), h(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const items = await Donation.find({ donor: req.user._id, status: 'delivered', deliveredAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } })
    .populate('match.shelter', 'name address').sort('deliveredAt').select('-proof.data');
  const rows = items.map((d) => ({ id: d._id, date: d.deliveredAt, item: d.itemName, foodType: d.foodType, weightKg: d.weightKg, shelter: d.match.shelter?.name, valueUsd: +(d.weightKg * fmv()).toFixed(2) }));
  res.json({ year, donor: { name: req.user.name, orgName: req.user.orgName, address: req.user.address }, rows,
    totalKg: +rows.reduce((s, x) => s + x.weightKg, 0).toFixed(1), totalUsd: +rows.reduce((s, x) => s + x.valueUsd, 0).toFixed(2), ratePerKg: fmv() });
}));
export default r;
