import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEFAULT_LOC, FOOD_TYPES, errMsg, getPosition } from '../api.js';

export function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => { e.preventDefault(); try { await login(f); nav('/'); } catch (x) { setErr(errMsg(x)); } };
  return (
    <main className="auth">
      <section className="hero">
        <h1>Good food, still good.<br />Get it to someone who needs it.</h1>
        <p>Donors post surplus, we match it to a nearby shelter with room for it, and a driver brings it over. Every step is tracked.</p>
      </section>
      <form className="card" onSubmit={submit}>
        <h2>Sign in</h2>
        <label>Email<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></label>
        {err && <p className="err">{err}</p>}
        <button className="primary">Sign in</button>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
        <p className="muted small">Demo: donor@demo.com, shelter@demo.com, driver@demo.com, admin@demo.com · password123</p>
      </form>
    </main>
  );
}

export function Register() {
  const { register } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ role: 'donor', name: '', orgName: '', email: '', password: '', phone: '', address: '', vehicleCapacityKg: 50, capacityKg: 100, acceptedTypes: FOOD_TYPES });
  const [loc, setLoc] = useState(DEFAULT_LOC); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (t) => setF({ ...f, acceptedTypes: f.acceptedTypes.includes(t) ? f.acceptedTypes.filter((x) => x !== t) : [...f.acceptedTypes, t] });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await register({ ...f, location: loc, vehicleCapacityKg: Number(f.vehicleCapacityKg), shelter: { capacityKg: Number(f.capacityKg), acceptedTypes: f.acceptedTypes } });
      nav('/');
    } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <main className="auth">
      <form className="card wide" onSubmit={submit}>
        <h2>Create your account</h2>
        <div className="seg" role="radiogroup" aria-label="Role">
          {[['donor', 'I have surplus food'], ['shelter', 'I run a shelter'], ['driver', 'I can drive']].map(([v, t]) =>
            <button type="button" key={v} className={f.role === v ? 'on' : ''} onClick={() => setF({ ...f, role: v })}>{t}</button>)}
        </div>
        <div className="grid2">
          <label>Your name<input value={f.name} onChange={set('name')} required /></label>
          {f.role !== 'driver' && <label>{f.role === 'shelter' ? 'Shelter name' : 'Business name'}<input value={f.orgName} onChange={set('orgName')} /></label>}
          <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>Password<input type="password" minLength={6} value={f.password} onChange={set('password')} required /></label>
          <label>Phone (for SMS alerts)<input value={f.phone} onChange={set('phone')} placeholder="+91…" /></label>
          <label>Address<input value={f.address} onChange={set('address')} /></label>
          {f.role === 'driver' && <label>Vehicle capacity (kg)<input type="number" min="1" value={f.vehicleCapacityKg} onChange={set('vehicleCapacityKg')} /></label>}
          {f.role === 'shelter' && <label>Storage capacity (kg)<input type="number" min="1" value={f.capacityKg} onChange={set('capacityKg')} /></label>}
        </div>
        {f.role === 'shelter' && (
          <fieldset><legend>Food types you accept</legend>
            <div className="chips">{FOOD_TYPES.map((t) => <button type="button" key={t} className={f.acceptedTypes.includes(t) ? 'on' : ''} onClick={() => toggle(t)}>{t}</button>)}</div>
          </fieldset>)}
        <div className="row">
          <button type="button" className="ghost" onClick={async () => { try { setLoc(await getPosition()); } catch (x) { setErr(x.message); } }}>Use my location</button>
          <span className="muted small">{loc.lat}, {loc.lng}</span>
        </div>
        {err && <p className="err">{err}</p>}
        <button className="primary">Create account</button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
