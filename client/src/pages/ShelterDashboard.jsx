import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, FOOD_TYPES } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import { Empty } from '../components/ui.jsx';

export default function ShelterDashboard() {
  const { tick, toast } = useAuth();
  const [s, setS] = useState(null);
  const [items, setItems] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api.get('/shelters/mine'), api.get('/shelters/mine/incoming')]);
    setS((old) => (old && old._dirty ? old : a.data));
    setItems(b.data);
  }, []);

  useEffect(() => {
    load();
  }, [tick, load]);

  if (!s) return <main className="page"><p className="muted">Loading shelter hub data…</p></main>;

  const toggle = (k, t) =>
    setS({
      ...s,
      _dirty: true,
      [k]: s[k].includes(t) ? s[k].filter((x) => x !== t) : [...s[k], t],
    });

  const save = async () => {
    setSaving(true);
    try {
      const { _dirty, ...body } = s;
      const r = await api.patch('/shelters/mine', body);
      setS(r.data);
      toast('Shelter capacity and food preferences saved');
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const free = Math.max(0, s.capacityKg - s.reservedKg);
  const pct = Math.min(100, Math.round((s.reservedKg / s.capacityKg) * 100));

  return (
    <main className="page">
      <div className="mission-header">
        <span className="badge good">🏠 Shelter Community Hub</span>
        <h1 style={{ marginTop: '6px' }}>{s.name}</h1>
        <p>Manage real-time storage availability and incoming food donations from donor kitchens.</p>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Storage Capacity & Preferences</h2>
          <span className={`badge ${free < 20 ? 'warn' : 'good'}`}>
            {free} kg Available Space ({100 - pct}% Free)
          </span>
        </div>
        <div className="meter" aria-label={`${free} kg free of ${s.capacityKg}`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          <strong>{s.reservedKg} kg</strong> reserved or stocked of <strong>{s.capacityKg} kg</strong> total capacity ({pct}% utilized).
        </p>

        <div className="grid2" style={{ marginTop: '16px' }}>
          <label>
            Maximum Storage Capacity (kg)
            <input
              type="number"
              value={s.capacityKg}
              onChange={(e) => setS({ ...s, _dirty: true, capacityKg: +e.target.value })}
            />
          </label>
          <label>
            Current Stock On-Hand (kg)
            <input
              type="number"
              value={s.reservedKg}
              onChange={(e) => setS({ ...s, _dirty: true, reservedKg: +e.target.value })}
            />
          </label>
        </div>

        <fieldset>
          <legend>Food Categories Accepted</legend>
          <div className="chips">
            {FOOD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={s.acceptedTypes.includes(t) ? 'on' : ''}
                onClick={() => toggle('acceptedTypes', t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Priority Needs (Matched First by Network)</legend>
          <div className="chips">
            {FOOD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={s.needs.includes(t) ? 'on' : ''}
                onClick={() => toggle('needs', t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Updating Settings…' : 'Save Shelter Settings'}
        </button>
      </section>

      <h2>Incoming & Received Deliveries</h2>
      {!items ? (
        <p className="muted">Checking for incoming deliveries…</p>
      ) : items.length === 0 ? (
        <Empty>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
          <strong>No incoming donations right now.</strong>
          <p style={{ margin: '8px 0 0' }}>Matched donations will appear here the moment volunteer drivers are assigned.</p>
        </Empty>
      ) : (
        items.map((d) => (
          <DonationCard key={d._id} d={{ ...d, match: { ...d.match, shelter: undefined } }} />
        ))
      )}
    </main>
  );
}
