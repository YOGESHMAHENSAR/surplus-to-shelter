import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LINKS = {
  donor: [['/donor', 'My donations'], ['/donor/new', 'Post surplus'], ['/impact', 'Impact']],
  shelter: [['/shelter', 'Shelter'], ['/impact', 'Impact']],
  driver: [['/driver', 'Deliveries'], ['/impact', 'Impact']],
  admin: [['/impact', 'Impact']],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <NavLink to="/" className="brand">Surplus<span>-to-</span>Shelter</NavLink>
      <nav>
        {(LINKS[user.role] || []).map(([to, t]) => <NavLink key={to} to={to} end>{t}</NavLink>)}
      </nav>
      <div className="who">{user.orgName || user.name} <em>{user.role}</em><button className="ghost" onClick={logout}>Sign out</button></div>
    </header>
  );
}
