import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, getPosition } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import SignaturePad from '../components/SignaturePad.jsx';
import { Empty } from '../components/ui.jsx';

const NEXT = { accepted: ['arrive_donor', "I've arrived at the donor"], at_donor: ['pickup', 'Confirm pickup'], picked_up: ['arrive_shelter', "I've arrived at the shelter"], at_shelter: ['deliver', 'Confirm delivery'] };

export default function DriverDashboard() {
  const { user, updateMe, tick, toast } = useAuth();
  const [open, setOpen] = useState([]); const [active, setActive] = useState([]); const [route, setRoute] = useState(null);
  const [proofFor, setProofFor] = useState(null);
  const load = useCallback(async () => {
    const [o, a] = await Promise.all([api.get('/driver/jobs/open'), api.get('/driver/jobs/active')]);
    setOpen(o.data); setActive(a.data);
    if (a.data.length && user.location?.lat) api.get('/driver/jobs/route').then((r) => setRoute(r.data)).catch(() => setRoute(null)); else setRoute(null);
  }, [user.location?.lat]);
  useEffect(() => { load(); }, [tick, load]);

  const run = (fn) => async (...a) => { try { await fn(...a); await load(); } catch (e) { toast(errMsg(e)); } };
  const toggleAvail = run(async () => {
    const patch = { isAvailable: !user.isAvailable };
    if (patch.isAvailable) { try { patch.location = await getPosition(); } catch { if (!user.location?.lat) throw new Error('Allow location access so we can find nearby pickups'); } }
    await updateMe(patch);
  });
  const refreshLoc = run(async () => updateMe({ location: await getPosition() }));
  const accept = run((id) => api.post(`/driver/jobs/${id}/accept`));
  const step = run((id, action) => api.post(`/driver/jobs/${id}/${action}`));

  return (
    <main className="page">
      <div className="row between">
        <h1>Deliveries</h1>
        <div className="row">
          <button className="ghost" onClick={refreshLoc}>Update location</button>
          <button className={user.isAvailable ? 'primary' : 'ghost'} onClick={toggleAvail}>{user.isAvailable ? 'Available for pickups' : 'Go available'}</button>
        </div>
      </div>
      <p className="muted">Vehicle capacity {user.vehicleCapacityKg} kg{user.location?.lat ? ` · last location ${user.location.lat}, ${user.location.lng}` : ''}</p>

      <h2>New pickup requests</h2>
      {open.length === 0 ? <Empty>{user.isAvailable ? 'No requests right now. You will get an alert the moment one comes in.' : 'Go available to receive pickup requests.'}</Empty> :
        open.map((d) => <DonationCard key={d._id} d={d}><p>Pickup: {d.pickup.address} → {d.match.shelter?.name}</p><button className="primary" onClick={() => accept(d._id)}>Accept pickup</button></DonationCard>)}

      <h2>Active</h2>
      {route && route.stops.length > 0 && (
        <section className="card">
          <h3>Optimised route · {route.totalKm} km · about {route.etaMin} min</h3>
          <ol className="stops">{route.stops.map((s, i) => <li key={i}><b>{s.type === 'pickup' ? 'Pick up' : 'Drop off'}</b> {s.itemName} at {s.label} <em>{s.legKm} km</em></li>)}</ol>
        </section>)}
      {active.length === 0 ? <Empty>No active jobs.</Empty> : active.map((d) => (
        <DonationCard key={d._id} d={d}>
          <p>Pickup: {d.pickup.address} · Drop-off: {d.match.shelter?.name}, {d.match.shelter?.address}</p>
          {NEXT[d.status] && (d.status === 'at_shelter'
            ? <button className="primary" onClick={() => setProofFor(d)}>{NEXT[d.status][1]}</button>
            : <button className="primary" onClick={() => step(d._id, NEXT[d.status][0])}>{NEXT[d.status][1]}</button>)}
        </DonationCard>))}

      {proofFor && <ProofModal d={proofFor} onClose={() => setProofFor(null)} onDone={async (body) => { await step(proofFor._id, 'deliver', body); setProofFor(null); }} />}
    </main>
  );
}

function ProofModal({ d, onClose, onDone }) {
  const [type, setType] = useState('signature'); const [data, setData] = useState(''); const [by, setBy] = useState('');
  const onFile = (e) => { const r = new FileReader(); r.onload = () => setData(r.result); if (e.target.files[0]) r.readAsDataURL(e.target.files[0]); };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Delivery confirmation">
      <div className="card">
        <h2>Confirm delivery of {d.itemName}</h2>
        <label>Received by<input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Shelter staff name" /></label>
        <div className="seg"><button type="button" className={type === 'signature' ? 'on' : ''} onClick={() => { setType('signature'); setData(''); }}>Signature</button><button type="button" className={type === 'photo' ? 'on' : ''} onClick={() => { setType('photo'); setData(''); }}>Photo</button></div>
        {type === 'signature' ? <SignaturePad onChange={setData} /> : <input type="file" accept="image/*" capture="environment" onChange={onFile} />}
        <div className="row"><button className="primary" disabled={!data} onClick={() => onDone({ type, data, receivedBy: by })}>Mark delivered</button><button className="ghost" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}
