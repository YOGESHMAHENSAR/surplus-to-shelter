import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEFAULT_LOC, FOOD_TYPES, errMsg, getPosition } from '../api.js';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await login(f);
      nav('/');
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <section className="hero">
        <span className="badge good">🌱 Zero Waste · Zero Hunger</span>
        <h1 style={{ marginTop: '12px' }}>
          Good food, still good.<br />
          Get it to someone who needs it today.
        </h1>
        <p>
          Surplus-to-Shelter connects food donors, local community kitchens, and volunteer drivers in real-time. Every meal rescued is tracked, verified, and delivered with care.
        </p>
        <div className="hero-stats">
          <span className="hero-stat-pill">🍲 100% Free Food Relief</span>
          <span className="hero-stat-pill">⚡ Instant Shelter Matching</span>
          <span className="hero-stat-pill">🌍 Real-time CO₂e Tracking</span>
        </div>
      </section>

      <form className="card" onSubmit={submit} style={{ padding: '28px' }}>
        <h2 style={{ marginTop: 0 }}>Sign in to Portal</h2>
        <p className="muted small" style={{ marginTop: '-4px', marginBottom: '16px' }}>
          Welcome back to the food rescue community
        </p>
        <label>
          Email address
          <input
            type="email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
            required
            placeholder="e.g., donor@demo.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
            required
            placeholder="••••••••"
          />
        </label>
        {err && <p className="err">{err}</p>}
        <button className="primary" style={{ width: '100%', marginTop: '10px' }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in to Dashboard'}
        </button>
        <p className="muted" style={{ textAlign: 'center', marginTop: '16px' }}>
          New to the movement? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Join as a Donor or Shelter</Link>
        </p>
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <p className="muted small" style={{ margin: 0 }}>
            <strong>Demo Logins:</strong> donor@demo.com · shelter@demo.com · driver@demo.com · admin@demo.com (Password: <code>password123</code>)
          </p>
        </div>
      </form>
    </main>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    role: 'donor',
    name: '',
    orgName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    vehicleCapacityKg: 50,
    capacityKg: 100,
    acceptedTypes: FOOD_TYPES,
  });
  const [loc, setLoc] = useState(DEFAULT_LOC);
  const [locSuccess, setLocSuccess] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (t) =>
    setF({
      ...f,
      acceptedTypes: f.acceptedTypes.includes(t)
        ? f.acceptedTypes.filter((x) => x !== t)
        : [...f.acceptedTypes, t],
    });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await register({
        ...f,
        location: loc,
        vehicleCapacityKg: Number(f.vehicleCapacityKg),
        shelter: { capacityKg: Number(f.capacityKg), acceptedTypes: f.acceptedTypes },
      });
      nav('/');
    } catch (x) {
      setErr(errMsg(x));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <form className="card wide" onSubmit={submit}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span className="badge good">🤝 Community Registration</span>
          <h2 style={{ marginTop: '8px', marginBottom: '4px' }}>Join the Food Relief Network</h2>
          <p className="muted">Together we turn excess food into warm meals for vulnerable communities.</p>
        </div>

        <div className="seg" role="radiogroup" aria-label="Role">
          {[
            ['donor', '🌱 Food Donor (Surplus Food)'],
            ['shelter', '🏠 Shelter / Kitchen'],
            ['driver', '🚚 Volunteer Driver'],
          ].map(([v, t]) => (
            <button
              type="button"
              key={v}
              className={f.role === v ? 'on' : ''}
              onClick={() => setF({ ...f, role: v })}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid2">
          <label>
            Your Name / Contact Person
            <input value={f.name} onChange={set('name')} required placeholder="e.g., Sarah Jenkins" />
          </label>
          {f.role !== 'driver' && (
            <label>
              {f.role === 'shelter' ? 'Shelter / Trust Name' : 'Restaurant / Business Name'}
              <input
                value={f.orgName}
                onChange={set('orgName')}
                placeholder={f.role === 'shelter' ? 'e.g., Hope Community Center' : 'e.g., Green Garden Caterers'}
              />
            </label>
          )}
          <label>
            Email Address
            <input type="email" value={f.email} onChange={set('email')} required placeholder="contact@domain.org" />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={6}
              value={f.password}
              onChange={set('password')}
              required
              placeholder="At least 6 characters"
            />
          </label>
          <label>
            Phone Number (for SMS & Dispatch)
            <input value={f.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          </label>
          <label>
            Physical Address
            <input value={f.address} onChange={set('address')} placeholder="Street, Neighborhood, City" />
          </label>
          {f.role === 'driver' && (
            <label>
              Vehicle Capacity (kg)
              <input type="number" min="1" value={f.vehicleCapacityKg} onChange={set('vehicleCapacityKg')} />
            </label>
          )}
          {f.role === 'shelter' && (
            <label>
              Cold & Dry Storage Capacity (kg)
              <input type="number" min="1" value={f.capacityKg} onChange={set('capacityKg')} />
            </label>
          )}
        </div>

        {f.role === 'shelter' && (
          <fieldset>
            <legend>Food Types Accepted at Your Shelter</legend>
            <div className="chips">
              {FOOD_TYPES.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={f.acceptedTypes.includes(t) ? 'on' : ''}
                  onClick={() => toggle(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div
          className="row"
          style={{
            marginTop: '12px',
            marginBottom: '16px',
            padding: '10px 14px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              try {
                const pos = await getPosition();
                setLoc(pos);
                setLocSuccess(true);
              } catch (x) {
                setErr(x.message);
              }
            }}
          >
            📍 Set Location via GPS
          </button>
          <span className="muted small">Coordinates: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
          {locSuccess && <span className="badge good">✓ Location set</span>}
        </div>

        {err && <p className="err">{err}</p>}

        <button className="primary" style={{ width: '100%', padding: '12px 20px', fontSize: '1.05rem' }} disabled={busy}>
          {busy ? 'Creating Account…' : 'Create Free Account & Join Network'}
        </button>

        <p className="muted" style={{ textAlign: 'center', marginTop: '16px' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Sign in here
          </Link>
        </p>
      </form>
    </main>
  );
}
