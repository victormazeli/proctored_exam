const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Middleware to authenticate JWT tokens
 */
exports.authenticateJWT = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        data: null
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or inactive user',
        data: null
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        data: null
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      data: null
    });
  }
};

/**
 * Middleware to check for specific user roles
 * @param {Array} roles - Array of allowed roles
 */
exports.authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        data: null
      });
    }
    next();
  };
};

// Legacy isAuthenticated function for backward compatibility
exports.isAuthenticated = exports.authenticateJWT;
  
  /**
   *  roles - Single role or array of allowed roles
   */
  exports.hasRole = (roles) => {
    return (req, res, next) => {
      // Convert single role to array for consistent handling
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (allowedRoles.includes(req.user.role)) {
        return next();
      }
      
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
        data: null
      });
    };
  };

