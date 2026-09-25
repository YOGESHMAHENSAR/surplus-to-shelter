const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'surplus-secret', {
    expiresIn: '30d',
  });
};

const registerUser = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'User registration is not implemented yet.',
  });
};

const loginUser = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'User login is not implemented yet.',
  });
};

const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user || { id: 'demo-user' },
  });
};

module.exports = { registerUser, loginUser, getMe, generateToken };
