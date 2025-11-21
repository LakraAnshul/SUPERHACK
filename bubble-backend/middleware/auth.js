const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please login again.'
      });
    }

    res.status(500).json({
      error: 'Server error during authentication.',
      details: error.message
    });
  }
};

// Manager role middleware
const requireManager = async (req, res, next) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        error: 'Access denied. Manager role required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Server error during role verification.',
      details: error.message
    });
  }
};

// Technician role middleware
const requireTechnician = async (req, res, next) => {
  try {
    if (req.user.role !== 'technician') {
      return res.status(403).json({
        error: 'Access denied. Technician role required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Server error during role verification.',
      details: error.message
    });
  }
};

// Allow both technician and manager
const requireTechnicianOrManager = async (req, res, next) => {
  try {
    if (!['technician', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Technician or Manager role required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Server error during role verification.',
      details: error.message
    });
  }
};

// Optional authentication (for public routes that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth, just continue without user
    next();
  }
};

module.exports = {
  auth,
  requireManager,
  requireTechnician,
  requireTechnicianOrManager,
  optionalAuth,
  generateToken
};
