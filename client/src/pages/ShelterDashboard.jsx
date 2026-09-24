import { useCallback, useEffect, useState } from 'react';
import { api, errMsg, FOOD_TYPES } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import { Empty } from '../components/ui.jsx';

export default function ShelterDashboard() {
  const { tick, toast } = useAuth();
  const [s, setS] = useState(null); const [items, setItems] = useState(null);
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api.get('/shelters/mine'), api.get('/shelters/mine/incoming')]);
    setS((old) => old && old._dirty ? old : a.data); setItems(b.data);
  }, []);
  useEffect(() => { load(); }, [tick, load]);
  if (!s) return <main className="page"><p>Loading…</p></main>;

  const toggle = (k, t) => setS({ ...s, _dirty: true, [k]: s[k].includes(t) ? s[k].filter((x) => x !== t) : [...s[k], t] });
  const save = async () => {
    try { const { _dirty, ...body } = s; const r = await api.patch('/shelters/mine', body); setS(r.data); toast('Shelter settings saved'); } catch (e) { toast(errMsg(e)); }
  };
  const free = Math.max(0, s.capacityKg - s.reservedKg);

  return (
    <main className="page">
      <h1>{s.name}</h1>
      <section className="card">
        <h2>Capacity & preferences</h2>
        <div className="meter" aria-label={`${free} kg free of ${s.capacityKg}`}><div style={{ width: `${Math.min(100, (s.reservedKg / s.capacityKg) * 100)}%` }} /></div>
        <p className="muted">{free} kg free · {s.reservedKg} kg stocked or reserved of {s.capacityKg} kg</p>
        <div className="grid2">
          <label>Storage capacity (kg)<input type="number" value={s.capacityKg} onChange={(e) => setS({ ...s, _dirty: true, capacityKg: +e.target.value })} /></label>
          <label>Current stock (kg)<input type="number" value={s.reservedKg} onChange={(e) => setS({ ...s, _dirty: true, reservedKg: +e.target.value })} /></label>
        </div>
        <fieldset><legend>Food types we accept</legend><div className="chips">{FOOD_TYPES.map((t) => <button key={t} className={s.acceptedTypes.includes(t) ? 'on' : ''} onClick={() => toggle('acceptedTypes', t)}>{t}</button>)}</div></fieldset>
        <fieldset><legend>Food we need most (matched first)</legend><div className="chips">{FOOD_TYPES.map((t) => <button key={t} className={s.needs.includes(t) ? 'on' : ''} onClick={() => toggle('needs', t)}>{t}</button>)}</div></fieldset>
        <button className="primary" onClick={save}>Save settings</button>
      </section>
      <h2>Incoming and received</h2>
      {!items ? <p>Loading…</p> : items.length === 0 ? <Empty>Nothing incoming. Matched donations appear here as soon as a slot is reserved for you.</Empty> :
        items.map((d) => <DonationCard key={d._id} d={{ ...d, match: { ...d.match, shelter: undefined } }} />)}
    </main>
  );
}
