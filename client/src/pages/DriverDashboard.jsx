import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, getPosition } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import SignaturePad from '../components/SignaturePad.jsx';
import { Empty } from '../components/ui.jsx';

const NEXT = {
  accepted: ['arrive_donor', "I've arrived at the donor"],
  at_donor: ['pickup', 'Confirm pickup from kitchen'],
  picked_up: ['arrive_shelter', "I've arrived at the shelter"],
  at_shelter: ['deliver', 'Confirm delivery & handoff'],
};

export default function DriverDashboard() {
  const { user, updateMe, tick, toast } = useAuth();
  const [open, setOpen] = useState([]);
  const [active, setActive] = useState([]);
  const [route, setRoute] = useState(null);
  const [proofFor, setProofFor] = useState(null);

  const load = useCallback(async () => {
    const [o, a] = await Promise.all([api.get('/driver/jobs/open'), api.get('/driver/jobs/active')]);
    setOpen(o.data);
    setActive(a.data);
    if (a.data.length && user.location?.lat) {
      api
        .get('/driver/jobs/route')
        .then((r) => setRoute(r.data))
        .catch(() => setRoute(null));
    } else {
      setRoute(null);
    }
  }, [user.location?.lat]);

  useEffect(() => {
    load();
  }, [tick, load]);

  const run = (fn) => async (...a) => {
    try {
      await fn(...a);
      await load();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const toggleAvail = run(async () => {
    const patch = { isAvailable: !user.isAvailable };
    if (patch.isAvailable) {
      try {
        patch.location = await getPosition();
      } catch {
        if (!user.location?.lat) throw new Error('Allow location access so we can find nearby pickups');
      }
    }
    await updateMe(patch);
    toast(patch.isAvailable ? '✅ You are now active for food rescue pickups' : 'Standby mode activated');
  });

  const refreshLoc = run(async () => {
    const pos = await getPosition();
    await updateMe({ location: pos });
    toast(`📍 Driver GPS updated: ${pos.lat}, ${pos.lng}`);
  });

  const accept = run((id) => api.post(`/driver/jobs/${id}/accept`));
  const step = run((id, action, data = {}) => api.post(`/driver/jobs/${id}/${action}`, data));

  return (
    <main className="page">
      <div className="mission-header">
        <div className="row between">
          <div>
            <span className="badge good">🚚 Volunteer Rescue Logistics</span>
            <h1 style={{ marginTop: '6px' }}>Volunteer Driver Dispatch</h1>
            <p>
              Vehicle Capacity: <strong>{user.vehicleCapacityKg} kg</strong>
              {user.location?.lat ? ` · Last known GPS: ${user.location.lat.toFixed(4)}, ${user.location.lng.toFixed(4)}` : ''}
            </p>
          </div>
          <div className="row">
            <button className="ghost" onClick={refreshLoc}>
              📍 Update GPS
            </button>
            <button className={user.isAvailable ? 'primary' : 'ghost'} onClick={toggleAvail}>
              {user.isAvailable ? '🟢 Online for Pickups' : '⚪ Go Available'}
            </button>
          </div>
        </div>
      </div>

      <h2>Available Rescue Pickups</h2>
      {open.length === 0 ? (
        <Empty>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚚</div>
          <strong>{user.isAvailable ? 'No pending requests nearby right now.' : 'Go available to receive pickup requests.'}</strong>
          <p style={{ margin: '8px 0 0' }}>
            {user.isAvailable ? 'You will be alerted instantly when surplus food needs transport.' : 'Toggle your status online to start receiving rescue dispatches.'}
          </p>
        </Empty>
      ) : (
        open.map((d) => (
          <DonationCard key={d._id} d={d}>
            <p className="muted" style={{ margin: '8px 0 12px' }}>
              <strong>Pickup:</strong> {d.pickup.address} → <strong>Shelter:</strong> {d.match.shelter?.name}
            </p>
            <button className="primary" onClick={() => accept(d._id)}>
              Accept Food Rescue Mission
            </button>
          </DonationCard>
        ))
      )}

      <h2>Active Rescue Missions</h2>
      {route && route.stops.length > 0 && (
        <section className="card" style={{ borderLeft: '5px solid var(--accent)' }}>
          <div className="row between">
            <h3>Optimized Rescue Route</h3>
            <span className="badge warn">{route.totalKm} km · ~{route.etaMin} mins</span>
          </div>
          <ol className="stops" style={{ marginTop: '12px' }}>
            {route.stops.map((s, i) => (
              <li key={i}>
                <b>{s.type === 'pickup' ? '📦 Collect' : '🏠 Drop off'}</b> {s.itemName} at {s.label}{' '}
                <em>({s.legKm} km)</em>
              </li>
            ))}
          </ol>
        </section>
      )}

      {active.length === 0 ? (
        <Empty>No ongoing trips in transit.</Empty>
      ) : (
        active.map((d) => (
          <DonationCard key={d._id} d={d}>
            <p className="muted" style={{ margin: '8px 0 12px' }}>
              <strong>Pickup:</strong> {d.pickup.address} · <strong>Destination:</strong> {d.match.shelter?.name}, {d.match.shelter?.address}
            </p>
            {NEXT[d.status] && (
              d.status === 'at_shelter' ? (
                <button className="primary" onClick={() => setProofFor(d)}>
                  ✍️ {NEXT[d.status][1]}
                </button>
              ) : (
                <button className="primary" onClick={() => step(d._id, NEXT[d.status][0])}>
                  ✓ {NEXT[d.status][1]}
                </button>
              )
            )}
          </DonationCard>
        ))
      )}

      {proofFor && (
        <ProofModal
          d={proofFor}
          onClose={() => setProofFor(null)}
          onDone={async (body) => {
            await step(proofFor._id, 'deliver', body);
            setProofFor(null);
          }}
        />
      )}
    </main>
  );
}

function ProofModal({ d, onClose, onDone }) {
  const [type, setType] = useState('signature');
  const [data, setData] = useState('');
  const [by, setBy] = useState('');

  const onFile = (e) => {
    const r = new FileReader();
    r.onload = () => setData(r.result);
    if (e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Delivery confirmation">
      <div className="card">
        <span className="badge good">🤝 Delivery Verification</span>
        <h2 style={{ marginTop: '8px' }}>Confirm Delivery: {d.itemName}</h2>
        <p className="muted small">Record handover proof from the receiving shelter staff.</p>

        <label>
          Staff / Recipient Name
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="e.g. Maria (Shelter Coordinator)" />
        </label>

        <div className="seg">
          <button
            type="button"
            className={type === 'signature' ? 'on' : ''}
            onClick={() => {
              setType('signature');
              setData('');
            }}
          >
            Digital Signature
          </button>
          <button
            type="button"
            className={type === 'photo' ? 'on' : ''}
            onClick={() => {
              setType('photo');
              setData('');
            }}
          >
            Proof Photo
          </button>
        </div>

        {type === 'signature' ? (
          <SignaturePad onChange={setData} />
        ) : (
          <input type="file" accept="image/*" capture="environment" onChange={onFile} />
        )}

        <div className="row" style={{ marginTop: '16px' }}>
          <button className="primary" disabled={!data} onClick={() => onDone({ type, data, receivedBy: by })}>
            ✓ Complete & Mark Delivered
          </button>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
