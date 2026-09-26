import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import { Login, Register } from './pages/Auth.jsx';
import DonorDashboard from './pages/DonorDashboard.jsx';
import PostDonation from './pages/PostDonation.jsx';
import ShelterDashboard from './pages/ShelterDashboard.jsx';
import DriverDashboard from './pages/DriverDashboard.jsx';
import Impact from './pages/Impact.jsx';
import Profile from './pages/Profile.jsx';

const HOME = { donor: '/donor', shelter: '/shelter', driver: '/driver', admin: '/impact' };

function Guard({ role, children }) {
  const { user } = useAuth();
  return role.includes(user.role) ? children : <Navigate to={HOME[user.role]} replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page">Loading…</p>;
  if (!user) return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>);
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={HOME[user.role]} replace />} />
        <Route path="/donor" element={<Guard role={['donor']}><DonorDashboard /></Guard>} />
        <Route path="/donor/new" element={<Guard role={['donor']}><PostDonation /></Guard>} />
        <Route path="/shelter" element={<Guard role={['shelter']}><ShelterDashboard /></Guard>} />
        <Route path="/driver" element={<Guard role={['driver']}><DriverDashboard /></Guard>} />
        <Route path="/impact" element={<Impact />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>);
}
