// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { body } = require('express-validator');

const router = express.Router();


router.post('/login', [
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],  authController.login);


router.post('/register', [
    body('username')
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })], authController.register);


router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/settings', authController.updateSettings);
router.post('/generate-api-token', authController.generateApiToken);
router.delete('/revoke-api-token/:tokenId', authController.revokeApiToken);

module.exports = router;