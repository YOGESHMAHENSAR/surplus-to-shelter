import Shelter from '../models/Shelter.js';
import { haversineKm } from '../utils/geo.js';

const PERISH = { cooked: 1, meat: 0.9, dairy: 0.8, produce: 0.5, bakery: 0.4, other: 0.4, packaged: 0.1, beverages: 0.1 };

// Food safety assessment + expiry risk score (0 low .. 1 high)
export function assessSafety(foodType, expiresAt, now = new Date()) {
  const hoursLeft = (new Date(expiresAt) - now) / 36e5;
  const urgency = hoursLeft <= 0 ? 1 : Math.max(0, 1 - hoursLeft / 12);
  const riskScore = +((PERISH[foodType] ?? 0.5) * 0.5 + urgency * 0.5).toFixed(2);
  return { hoursLeft: +hoursLeft.toFixed(1), riskScore, safe: hoursLeft >= 1.5 && riskScore < 0.9 };
}

// Real-time geo-matching: eligible shelters -> capacity check -> preference filter -> score -> reserve slot
export async function matchDonation(d) {
  const safety = assessSafety(d.foodType, d.expiresAt);
  if (!safety.safe)
    return { ok: false, reason: `Food safety risk too high (risk ${safety.riskScore}, ${safety.hoursLeft}h left)`, safety };

  const maxKm = Number(process.env.MATCH_RADIUS_KM) || 25;
  const shelters = await Shelter.find({ active: true });
  const cands = shelters
    .map((s) => ({ s, dist: haversineKm(d.pickup, s.location) }))
    .filter((x) => x.dist <= maxKm)                                   // nearby eligible shelters
    .filter((x) => x.s.capacityKg - x.s.reservedKg >= d.weightKg)     // capacity for food volume
    .filter((x) => x.s.acceptedTypes.includes(d.foodType))            // shelter takes this food type
    .map((x) => {
      const free = x.s.capacityKg - x.s.reservedKg;
      const score = 0.5 * (1 - x.dist / maxKm) + 0.2 * Math.min(1, free / (d.weightKg * 3)) + 0.3 * (x.s.needs.includes(d.foodType) ? 1 : 0);
      return { ...x, score: +score.toFixed(3) };
    })
    .sort((a, b) => b.score - a.score);

  for (const c of cands) {
    // atomic slot reservation (prevents two donations grabbing the same capacity)
    const got = await Shelter.findOneAndUpdate(
      { _id: c.s._id, $expr: { $gte: [{ $subtract: ['$capacityKg', '$reservedKg'] }, d.weightKg] } },
      { $inc: { reservedKg: d.weightKg } }, { new: true });
    if (got) return { ok: true, shelter: got, distanceKm: +c.dist.toFixed(2), score: c.score, safety };
  }
  return { ok: false, reason: 'No nearby shelter has capacity for this food type right now', safety };
}

export const releaseSlot = (shelterId, kg) => Shelter.updateOne({ _id: shelterId, reservedKg: { $gte: kg } }, { $inc: { reservedKg: -kg } });
