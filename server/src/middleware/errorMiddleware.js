/**
 * Centralized error handling middleware
 * Should be the last middleware in the app
 */
export const errorMiddleware = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500
  });

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 6MB limit' });
    }
    if (err.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({ message: 'Too many parts' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // Mongoose cast errors
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid id' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Custom API errors
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  // Generic error
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export default errorMiddleware;
