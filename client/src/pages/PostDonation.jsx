import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg, FOOD_TYPES, getPosition } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';

const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export default function PostDonation() {
    const { user, toast } = useAuth();
    const nav = useNavigate();
    const [method, setMethod] = useState('ai');
    const [photo, setPhoto] = useState(null);
    const [preview, setPreview] = useState('');
    const [ai, setAi] = useState(null);
    const [busy, setBusy] = useState(false);
    const [locating, setLocating] = useState(false);
    const [locSuccess, setLocSuccess] = useState(false);
    const [err, setErr] = useState('');
    const [result, setResult] = useState(null);
    const [f, setF] = useState({
        itemName: '', foodType: 'cooked', quantity: '1', weight: '', unit: 'kg',
        pickupAddress: user.address || '', pickupLat: user.location?.lat ?? 26.9124, pickupLng: user.location?.lng ?? 75.7873,
        expiresAt: toLocal(new Date(Date.now() + 6 * 36e5)),
    });
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

    const handleUseLocation = async () => {
        setLocating(true);
        setLocSuccess(false);
        setErr('');
        try {
            const p = await getPosition();
            setF((prev) => ({ ...prev, pickupLat: p.lat, pickupLng: p.lng }));
            setLocSuccess(true);
            if (toast) {
                toast(`📍 Location updated: ${p.lat}, ${p.lng}`);
            }
        } catch (x) {
            setErr(x.message || 'Unable to retrieve location');
        } finally {
            setLocating(false);
        }
    };

    const onPhoto = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
        setAi(null);
        setErr('');
        if (method !== 'ai') return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('photo', file);
            const { data } = await api.post('/donations/classify', fd);
            setAi(data);
            if (data.source !== 'fallback' && data.source !== 'unknown') {
                setF((p) => ({
                    ...p,
                    itemName: data.itemName || p.itemName,
                    foodType: data.foodType || p.foodType,
                    weight: data.estimatedWeightKg ?? p.weight,
                    unit: 'kg'
                }));
            }
        } catch (x) {
            setAi({ source: 'unavailable', message: 'AI classification unavailable. Please enter details manually.' });
            setErr('');
        } finally {
            setBusy(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
            const fd = new FormData();
            Object.entries(f).forEach(([k, v]) => fd.append(k, v));
            fd.set('expiresAt', new Date(f.expiresAt).toISOString());
            fd.append('classificationMethod', method === 'ai' && ['gemini', 'claude', 'ai'].includes(ai?.source) ? 'ai' : 'manual');
            if (ai?.confidence) fd.append('aiConfidence', ai.confidence);
            if (photo) fd.append('photo', photo);
            const { data } = await api.post('/donations', fd);
            setResult(data);
        } catch (x) {
            setErr(errMsg(x));
        } finally {
            setBusy(false);
        }
    };

    if (result) return (
        <main className="page narrow">
            <div className="mission-header">
                <span className="badge good">🤝 Mission Progress</span>
                <h1 style={{ marginTop: '6px' }}>
                    {result.status === 'rejected' ? "Matching in Progress" : "Donation Submitted to Network"}
                </h1>
                <p>Thank you for preventing food waste and feeding our community. We are matching this with the closest verified shelter.</p>
            </div>
            <DonationCard d={result} showTimeline />
            <div className="row" style={{ marginTop: '20px' }}>
                <button className="primary" onClick={() => nav('/donor')}>View My Donations</button>
                <button className="ghost" onClick={() => setResult(null)}>Post Another Donation</button>
            </div>
        </main>
    );

    return (
        <main className="page narrow">
            <div className="mission-header">
                <span className="badge good">🌿 Zero Hunger Mission</span>
                <h1 style={{ marginTop: '6px' }}>Post Surplus Food</h1>
                <p>Every kilogram of rescued food supports community kitchens and shelters in need. Post details below to initiate instant volunteer dispatch.</p>
            </div>

            <form className="card" onSubmit={submit}>
                <div className="seg" role="radiogroup" aria-label="Classification method">
                    <button type="button" className={method === 'ai' ? 'on' : ''} onClick={() => setMethod('ai')}>
                        ✨ Identify with AI Vision
                    </button>
                    <button type="button" className={method === 'manual' ? 'on' : ''} onClick={() => setMethod('manual')}>
                        ✏️ Enter Manually
                    </button>
                </div>

                <label>
                    <span>Food Photograph <small className="muted">(helps shelters verify safety & type)</small></span>
                    <input type="file" accept="image/*" capture="environment" onChange={onPhoto} />
                </label>

                {preview && (
                    <div style={{ textAlign: 'center' }}>
                        <img src={preview} alt="Surplus food preview" className="preview" />
                    </div>
                )}

                {busy && method === 'ai' && (
                    <div className="ai-box">
                        <p style={{ margin: 0 }}>🌱 <strong>Analyzing photo with AI...</strong> Detecting food category and estimating weight.</p>
                    </div>
                )}

                {ai && (
                    <div className={`ai-box ${ai.source === 'unavailable' ? 'unavailable' : ''}`}>
                        {['gemini', 'ai', 'claude'].includes(ai.source) ? (
                            <p style={{ margin: 0 }}>
                                <strong>✓ AI Detected:</strong> {ai.foodType} ({ai.itemName || 'Food item'}), ~<strong>{ai.estimatedWeightKg} kg</strong> ({Math.round(ai.confidence * 100)}% match confidence). Details auto-filled below.
                            </p>
                        ) : ai.source === 'unavailable' ? (
                            <p style={{ margin: 0 }}>⚠️ AI classification unavailable. Please fill in the details below manually.</p>
                        ) : (
                            <p style={{ margin: 0 }}>✓ Photo uploaded. Please verify the food details below.</p>
                        )}
                    </div>
                )}

                <div className="grid2">
                    <label>
                        Item Name
                        <input value={f.itemName} onChange={set('itemName')} required placeholder="e.g., Fresh apples, Rice & Dal trays" />
                    </label>
                    <label>
                        Food Category
                        <select value={f.foodType} onChange={set('foodType')}>
                            {FOOD_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                        </select>
                    </label>
                    <label>
                        Quantity Notes
                        <input value={f.quantity} onChange={set('quantity')} placeholder="e.g., 4 boxes, 2 large containers" />
                    </label>
                    <div className="row nowrap">
                        <label className="grow">
                            Estimated Weight
                            <input type="number" value={f.weight} onChange={set('weight')} required />
                        </label>
                        <label style={{ width: '120px' }}>
                            Unit
                            <select value={f.unit} onChange={set('unit')}>
                                {['kg', 'lb', 'g', 'servings', 'items'].map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </label>
                    </div>
                    <label>
                        Pickup Location Address
                        <input value={f.pickupAddress} onChange={set('pickupAddress')} required placeholder="e.g., Central Kitchen, Sector 4" />
                    </label>
                    <label>
                        Safe to Consume Until
                        <input type="datetime-local" value={f.expiresAt} onChange={set('expiresAt')} required />
                    </label>
                </div>

                <div className="row" style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <button type="button" className="ghost" disabled={locating} onClick={handleUseLocation}>
                        {locating ? '📍 Pinpointing GPS…' : '📍 Use My Current Location'}
                    </button>
                    <span className="muted small">Coordinates: {f.pickupLat.toFixed(4)}, {f.pickupLng.toFixed(4)}</span>
                    {locSuccess && <span className="badge good">✓ Location Verified</span>}
                </div>

                {err && <p className="err" style={{ marginTop: '12px' }}>{err}</p>}

                <button className="primary" style={{ marginTop: '1.25rem', width: '100%', padding: '12px 20px', fontSize: '1.05rem' }} disabled={busy}>
                    {busy ? 'Processing Donation…' : '🤝 Publish Donation for Shelter Matching'}
                </button>
            </form>
        </main>
    );
}
