// controllers/authController.js
const User = require('../models/user');
const Certification = require('../models/certification');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

/**
 * Render login page
 */
exports.getLogin = (req, res) => {
  // If already logged in, redirect to home
  if (req.isAuthenticated()) {
    return res.redirect('/exams/select');
  }
  
  res.render('auth/login', {
    title: 'Login',
    returnTo: req.query.returnTo || ''
  });
};

/**
 * Process login request
 */
exports.postLogin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/auth/login');
  }
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login');
      return res.redirect('/auth/login');
    }
    
    if (!user) {
      req.flash('error_msg', info.message);
      return res.redirect('/auth/login');
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('Session error:', err);
        req.flash('error_msg', 'Failed to establish session');
        return res.redirect('/auth/login');
      }
      
      // Update last login timestamp
      User.findByIdAndUpdate(user._id, {
        lastLogin: new Date()
      }).catch(err => console.error('Failed to update last login:', err));
      
      // Redirect to original destination or default
      const returnTo = req.body.returnTo || '/exams/select';
      res.redirect(returnTo);
    });
  })(req, res, next);
};

/**
 * Render registration page
 */
exports.getRegister = (req, res) => {
  // If already logged in, redirect to home
  if (req.isAuthenticated()) {
    return res.redirect('/exams/select');
  }
  
  res.render('auth/register', {
    title: 'Register'
  });
};

/**
 * Process registration request
 */
exports.postRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register',
      errors: errors.array(),
      username: req.body.username,
      email: req.body.email
    });
  }
  
  const { username, email, password, confirmPassword } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register',
        error_msg: 'Username or email already exists',
        username,
        email
      });
    }
    
    if (password !== confirmPassword) {
      return res.render('auth/register', {
        title: 'Register',
        error_msg: 'Passwords do not match',
        username,
        email
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user',
      profile: {
        name: username
      },
      settings: {
        proctorEnabled: true,
        notificationsEnabled: true
      },
      metrics: {
        totalAttempts: 0,
        examsPassed: 0,
        averageScore: 0,
        totalTimeSpent: 0
      },
      certificationProgress: []
    });
    
    await newUser.save();
    
    req.flash('success_msg', 'Registration successful! You can now log in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('auth/register', {
      title: 'Register',
      error_msg: 'An error occurred during registration',
      username,
      email
    });
  }
};

/**
 * Log out user
 */
exports.logout = (req, res) => {
  req.logout(function(err) {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    req.flash('success_msg', 'You are now logged out');
    res.redirect('/auth/login');
  });
};

/**
 * Render forgot password page
 */
exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password'
  });
};

/**
 * Process forgot password request
 */
exports.postForgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/forgot-password', {
      title: 'Forgot Password',
      errors: errors.array(),
      email: req.body.email
    });
  }
  
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal that email doesn't exist
      req.flash('success_msg', 'If an account exists with that email, a password reset link has been sent.');
      return res.redirect('/auth/login');
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // In a real application, send email with reset link
    // For this implementation, just show the token
    console.log(`Reset Token for ${email}: ${resetToken}`);
    
    req.flash('success_msg', 'If an account exists with that email, a password reset link has been sent.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Render reset password page
 */
exports.getResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'Password reset token is invalid or has expired');
      return res.redirect('/auth/forgot-password');
    }
    
    res.render('auth/reset-password', {
      title: 'Reset Password',
      token
    });
  } catch (err) {
    console.error('Reset password page error:', err);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect('/auth/forgot-password');
  }
};

/**
 * Process reset password request
 */
exports.postResetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/reset-password', {
      title: 'Reset Password',
      errors: errors.array(),
      token: req.params.token
    });
  }
  
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      req.flash('error_msg', 'Password reset token is invalid or has expired');
      return res.redirect('/auth/forgot-password');
    }
    
    if (password !== confirmPassword) {
      return res.render('auth/reset-password', {
        title: 'Reset Password',
        error_msg: 'Passwords do not match',
        token
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    req.flash('success_msg', 'Password has been reset successfully. You can now log in with your new password.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Reset password error:', err);
    req.flash('error_msg', 'An error occurred. Please try again.');
    res.redirect(`/auth/reset-password/${req.params.token}`);
  }
};

/**
 * Render profile page
 */
exports.getProfile = async (req, res) => {
  try {
    // Get user with attempts count
    const user = await User.findById(req.user._id);
    
    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/');
    }
    
    // Get certification progress
    const certificationProgress = await Promise.all(
      user.certificationProgress.map(async (progress) => {
        const certification = await Certification.findById(progress.certificationId)
          .select('name code');
        
        return {
          ...progress.toObject(),
          certification: certification || { name: 'Unknown Certification' }
        };
      })
    );
    
    res.render('auth/profile', {
      title: 'My Profile',
      user,
      certificationProgress
    });
  } catch (err) {
    console.error('Profile page error:', err);
    req.flash('error_msg', 'Failed to load profile');
    res.redirect('/');
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { name, email, currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Check if email is changed and already exists
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      
      user.email = email.toLowerCase();
    }
    
    // Update profile name
    if (name) {
      user.profile.name = name;
    }
    
    // Update password if provided
    if (newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating profile'
    });
  }
};

/**
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { proctorEnabled, webcamPreference, notificationsEnabled } = req.body;
    
    await User.findByIdAndUpdate(req.user._id, {
      settings: {
        proctorEnabled: proctorEnabled === 'true',
        webcamPreference,
        notificationsEnabled: notificationsEnabled === 'true'
      }
    });
    
    return res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (err) {
    console.error('Settings update error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating settings'
    });
  }
};

/**
 * Generate API token for user
 */
exports.generateApiToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Generate JWT token
    const payload = {
      id: user._id,
      username: user.username,
      role: user.role
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '30d' }
    );
    
    // Save token reference to user
    user.apiTokens = user.apiTokens || [];
    user.apiTokens.push({
      token: token.slice(-10), // Store only last 10 chars for reference
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      lastUsed: null
    });
    
    await user.save();
    
    return res.json({
      success: true,
      token
    });
  } catch (err) {
    console.error('API token generation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate API token'
    });
  }
};

/**
 * Revoke API token
 */
exports.revokeApiToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const user = await User.findById(req.user._id);
    
    if (!user.apiTokens || user.apiTokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tokens found'
      });
    }
    
    // Remove the token
    user.apiTokens = user.apiTokens.filter(
      token => token._id.toString() !== tokenId
    );
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (err) {
    console.error('Token revocation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke token'
    });
  }
};