import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = {
  donor: [['/donor', 'My Donations'], ['/donor/new', 'Post Surplus'], ['/impact', 'Impact']],
  shelter: [['/shelter', 'Shelter Hub'], ['/impact', 'Impact']],
  driver: [['/driver', 'Deliveries'], ['/impact', 'Impact']],
  admin: [['/impact', 'Impact']],
};

const ROLE_ICONS = {
  donor: '🌱 Donor',
  shelter: '🏠 Shelter',
  driver: '🚚 Driver',
  admin: '🛡️ Admin',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <NavLink to="/" className="brand">
        <span className="brand-icon" aria-hidden="true">🌱</span>
        <span>Surplus</span>-to-<span>Shelter</span>
        <span className="brand-sub">NGO Relief</span>
      </NavLink>
      <nav>
        {(LINKS[user.role] || []).map(([to, t]) => (
          <NavLink key={to} to={to} end>
            {t}
          </NavLink>
        ))}
        <NavLink to="/profile" end>
          Profile
        </NavLink>
      </nav>
      <div className="who">
        <NavLink
          to="/profile"
          style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          title="View profile and verification documents"
        >
          <span>{user.orgName || user.name}</span>
          <em>{ROLE_ICONS[user.role] || user.role}</em>
        </NavLink>
        <button className="ghost" onClick={logout} title="Sign out of account">
          Sign out
        </button>
      </div>
    </header>
  );
}
