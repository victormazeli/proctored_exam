/**
 * config/passport.js - Passport Authentication Configuration
 * Sets up local strategy for authentication with role support
 */

const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const User = require('../models/user');

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'kjhruht588u659u6957u9u'
};

module.exports = function(passport) {
  // Configure the local strategy for use by Passport
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' }, // Use email as the username field
      async (email, password, done) => {
        try {
          // Find the user by email
          const user = await User.findOne({ email: email.toLowerCase() });
          
          // If user not found
          if (!user) {
            return done(null, false, { message: 'Email is not registered' });
          }
          
          // Check if account is active
          if (!user.active) {
            return done(null, false, { message: 'Account is deactivated. Please contact admin.' });
          }
          
          // Match password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
          }
          
          // Update last login time
          user.lastLogin = new Date();
          await user.save();
          
          // Authentication succeeded
          return done(null, user);
        } catch (err) {
          console.error('Error in passport local strategy:', err);
          return done(err);
        }
      }
    )
  );

  passport.use(new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const user = await User.findById(jwtPayload.id);
      
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  }));

  // Configure Passport to use sessions
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err);
    }
  });
};