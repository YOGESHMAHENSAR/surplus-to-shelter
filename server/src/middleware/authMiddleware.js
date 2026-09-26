import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const secret = () => process.env.JWT_SECRET || 'dev_secret';

export const signToken = (u) => jwt.sign({ id: u._id, role: u.role }, secret(), { expiresIn: '7d' });

/**
 * Middleware to verify JWT token and authenticate user
 * Attaches user object to req.user if valid
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Not signed in' });
    
    const { id } = jwt.verify(token, secret());
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: 'Account not found' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Session expired. Sign in again.' });
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Required roles for access
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Not allowed for your role' });
  }
};

// Alias for backward compatibility
export const protect = authMiddleware;

export default authMiddleware;
