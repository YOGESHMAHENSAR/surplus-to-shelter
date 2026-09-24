import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg, FOOD_TYPES, getPosition } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';

const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export default function PostDonation() {
  const { user } = useAuth(); const nav = useNavigate();
  const [method, setMethod] = useState('ai');
  const [photo, setPhoto] = useState(null); const [preview, setPreview] = useState('');
  const [ai, setAi] = useState(null); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [result, setResult] = useState(null);
  const [f, setF] = useState({
    itemName: '', foodType: 'cooked', quantity: '', weight: '', unit: 'kg',
    pickupAddress: user.address || '', pickupLat: user.location?.lat ?? 26.9124, pickupLng: user.location?.lng ?? 75.7873,
    expiresAt: toLocal(new Date(Date.now() + 6 * 36e5)),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setPhoto(file); setPreview(URL.createObjectURL(file)); setAi(null); setErr('');
    if (method !== 'ai') return;
    setBusy(true);
    try {   // AI/CV detects food type & estimated weight
      const fd = new FormData(); fd.append('photo', file);
      const { data } = await api.post('/donations/classify', fd);
      setAi(data);
      if (data.source === 'ai') setF((p) => ({ ...p, itemName: data.itemName || p.itemName, foodType: data.foodType, weight: data.estimatedWeightKg, unit: 'kg' }));
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      fd.set('expiresAt', new Date(f.expiresAt).toISOString());
      fd.append('classificationMethod', method === 'ai' && ai?.source === 'ai' ? 'ai' : 'manual');
      if (ai?.confidence) fd.append('aiConfidence', ai.confidence);
      if (photo) fd.append('photo', photo);
      const { data } = await api.post('/donations', fd);
      setResult(data);
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  if (result) return (
    <main className="page narrow">
      <h1>{result.status === 'rejected' ? "We couldn't place this yet" : 'Donation submitted'}</h1>
      <DonationCard d={result} showTimeline />
      <div className="row"><button className="primary" onClick={() => nav('/donor')}>View my donations</button><button className="ghost" onClick={() => setResult(null)}>Post another</button></div>
    </main>);

  return (
    <main className="page narrow">
      <h1>Post surplus food</h1>
      <form className="card" onSubmit={submit}>
        <div className="seg" role="radiogroup" aria-label="Classification method">
          <button type="button" className={method === 'ai' ? 'on' : ''} onClick={() => setMethod('ai')}>Identify from photo</button>
          <button type="button" className={method === 'manual' ? 'on' : ''} onClick={() => setMethod('manual')}>Enter manually</button>
        </div>
        <label>Photo of the food<input type="file" accept="image/*" capture="environment" onChange={onPhoto} /></label>
        {preview && <img src={preview} alt="Food preview" className="preview" />}
        {busy && method === 'ai' && <p className="muted">Reading your photo…</p>}
        {ai && <p className="muted">{ai.source === 'ai' ? `Detected ${ai.foodType}, about ${ai.estimatedWeightKg} kg (${Math.round(ai.confidence * 100)}% sure). Check the details below.` : 'Photo saved. Automatic detection is unavailable, so fill in the details below.'}</p>}
        <div className="grid2">
          <label>Item<input value={f.itemName} onChange={set('itemName')} required placeholder="e.g. Veg biryani trays" /></label>
          <label>Food type<select value={f.foodType} onChange={set('foodType')}>{FOOD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Quantity note<input value={f.quantity} onChange={set('quantity')} placeholder="e.g. 6 trays" /></label>
          <div className="row nowrap">
            <label className="grow">Weight<input type="number" step="0.1" min="0.1" value={f.weight} onChange={set('weight')} required /></label>
            <label>Unit<select value={f.unit} onChange={set('unit')}>{['kg', 'lb', 'g', 'servings', 'items'].map((u) => <option key={u}>{u}</option>)}</select></label>
          </div>
          <label>Pickup address<input value={f.pickupAddress} onChange={set('pickupAddress')} required /></label>
          <label>Safe to eat until<input type="datetime-local" value={f.expiresAt} onChange={set('expiresAt')} required /></label>
        </div>
        <div className="row">
          <button type="button" className="ghost" onClick={async () => { try { const p = await getPosition(); setF({ ...f, pickupLat: p.lat, pickupLng: p.lng }); } catch (x) { setErr(x.message); } }}>Use my current location</button>
          <span className="muted small">Pickup pin: {f.pickupLat}, {f.pickupLng}</span>
        </div>
        {err && <p className="err">{err}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Working…' : 'Submit donation'}</button>
      </form>
    </main>
  );
}
