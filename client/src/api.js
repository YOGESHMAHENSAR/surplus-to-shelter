import axios from 'axios';

const apiBase = import.meta.env.API_URL || '/api';
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
