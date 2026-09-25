export const haversineKm = (a, b) => {
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Multi-stop route optimisation: greedy nearest-neighbour that respects pickup-before-dropoff.
export function optimizeRoute(start, jobs) {
  const pending = [];
  for (const j of jobs) {
    const needsPickup = ['accepted', 'at_donor'].includes(j.status);
    const sh = j.match.shelter;
    if (needsPickup)
      pending.push({ jobId: String(j._id), type: 'pickup', label: j.pickup.address || 'Donor', itemName: j.itemName, lat: j.pickup.lat, lng: j.pickup.lng });
    pending.push({ jobId: String(j._id), type: 'dropoff', label: sh.name, itemName: j.itemName, lat: sh.location.lat, lng: sh.location.lng, requires: needsPickup ? `${j._id}:pickup` : null });
  }
  const done = new Set(); const order = []; let cur = start, total = 0;
  while (pending.length) {
    const cand = pending.filter((s) => !s.requires || done.has(s.requires));
    cand.sort((a, b) => haversineKm(cur, a) - haversineKm(cur, b));
    const n = cand[0], d = haversineKm(cur, n);
    total += d; order.push({ ...n, legKm: +d.toFixed(2) });
    done.add(`${n.jobId}:${n.type}`); cur = n;
    pending.splice(pending.indexOf(n), 1);
  }
  return { stops: order, totalKm: +total.toFixed(2), etaMin: Math.round((total / 30) * 60 + order.length * 5) };
}
