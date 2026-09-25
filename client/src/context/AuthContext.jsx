import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';

const Ctx = createContext();
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [tick, setTick] = useState(0); // bumps on every realtime event so pages can refetch

  const toast = useCallback((msg) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return setLoading(false);
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const s = io({ auth: { token: localStorage.getItem('token') } });
    s.on('job:new', (p) => { toast(`New pickup nearby: ${p.itemName}, ${p.weightKg} kg, ${p.distanceKm} km away`); setTick((t) => t + 1); });
    s.on('donation:update', (p) => { toast(`${p.itemName} is now ${p.status.replace('_', ' ')}`); setTick((t) => t + 1); });
    return () => s.disconnect();
  }, [user?._id]);

  const authenticate = async (path, body) => {
    const r = await api.post(path, body);
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const updateMe = async (patch) => { const r = await api.patch('/auth/me', patch); setUser(r.data.user); return r.data.user; };

  return (
    <Ctx.Provider value={{ user, loading, tick, toast, login: (b) => authenticate('/auth/login', b), register: (b) => authenticate('/auth/register', b), logout, updateMe }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>
    </Ctx.Provider>
  );
}
