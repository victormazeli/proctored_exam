const passport = require('passport');

/**
 * middleware/auth.js - Authentication and Role-based Access Middleware
 */

/**
 * Ensures the user is authenticated before accessing a route
 * Redirects to login if not authenticated
 */
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to access this resource');
    res.redirect('/auth/login');
  };
  
  /**
   * Ensures the user is not authenticated (for login/register pages)
   * Redirects to dashboard if already authenticated
   */
  const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/exams/select');
  };
  
  /**
   * Checks if the user has admin role
   * Returns 403 Forbidden if not an admin
   */
  const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.status(403).render('errors/403', {
      title: '403 - Access Forbidden',
      message: 'You do not have permission to access this resource'
    });
  };
  
  /**
   * Factory function to create role-based middleware
   * @param {string|string[]} roles - Single role or array of allowed roles
   * @returns {function} Middleware function
   */
  const hasRole = (roles) => {
    return (req, res, next) => {
      // Convert single role to array for consistent handling
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (req.isAuthenticated() && allowedRoles.includes(req.user.role)) {
        return next();
      }
      
      res.status(403).render('errors/403', {
        title: '403 - Access Forbidden',
        message: 'You do not have permission to access this resource'
      });
    };
  };

 const authenticateJwt = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: info.message || 'Invalid token'
        });
      }
      
      req.user = user;
      next();
    })(req, res, next);
  };
  
  module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin,
    hasRole,
    authenticateJwt
  };