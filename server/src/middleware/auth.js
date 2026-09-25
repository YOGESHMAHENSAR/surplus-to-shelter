import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const secret = () => process.env.JWT_SECRET || 'dev_secret';
export const signToken = (u) => jwt.sign({ id: u._id, role: u.role }, secret(), { expiresIn: '7d' });

export const protect = async (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    if (!t) return res.status(401).json({ message: 'Not signed in' });
    const { id } = jwt.verify(t, secret());
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: 'Account not found' });
    next();
  } catch { res.status(401).json({ message: 'Session expired. Sign in again.' }); }
};

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Not allowed for your role' });
