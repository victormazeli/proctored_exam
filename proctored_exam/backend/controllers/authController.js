const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

/**
 * User login
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
  
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Return user data and token
    return res.json({
      success: true,
      token: `Bearer ${token}`,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        settings: user.settings
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Register new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
  
    const { username, email, password, confirmPassword } = req.body;
    
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
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
      active: true,
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
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful'
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
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
    
    const user = await User.findById(req.user.id);
    
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
      message: 'Server error while updating profile'
    });
  }
};

/**
 * Update user settings
 * @route PUT /api/auth/settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const { proctorEnabled, webcamPreference, notificationsEnabled } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      settings: {
        proctorEnabled: Boolean(proctorEnabled),
        webcamPreference,
        notificationsEnabled: Boolean(notificationsEnabled)
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
      message: 'Server error while updating settings'
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Don't reveal if user exists or not
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link will be sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    
    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // In a real app, send email with reset link
    // For this implementation, return the token in the response
    console.log(`Reset Token for ${email}: ${resetToken}`);
    
    return res.json({
      success: true,
      message: 'Password reset requested successfully',
      resetToken // In production, remove this line and send via email
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    // Verify passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
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
    
    return res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Generate API token for user
 * @route POST /api/auth/token
 */
exports.generateApiToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Generate JWT token with longer expiry
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      tokenType: 'api'
    };
    
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
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
 * @route DELETE /api/auth/token/:tokenId
 */
exports.revokeApiToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    const user = await User.findById(req.user.id);
    
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