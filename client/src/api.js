import axios from 'axios';

// Vite requires the VITE_ prefix. Provide your Render backend URL as the fallback:
const apiBase = import.meta.env.VITE_API_URL || 'https://https://surplus-to-shelter-3vhr.onrender.com/api';

export const api = axios.create({ baseURL: apiBase });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

export const errMsg = (e) => e.response?.data?.message || e.message;
export const FOOD_TYPES = ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages', 'other'];
export const DEFAULT_LOC = { lat: 26.9124, lng: 75.7873 }; // Jaipur

export const getPosition = () => new Promise((res, rej) =>
  navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => res({ lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) }), () => rej(new Error('Location permission denied'))) : rej(new Error('Geolocation unavailable')));