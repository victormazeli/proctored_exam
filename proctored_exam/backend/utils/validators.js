const { body, } = require('express-validator');

exports.validateCreateUser = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

];

exports.validateCertification = [
    body('name')
      .notEmpty().withMessage('Certification name is required')
      .isString().withMessage('Name must be a string')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    
    body('code')
      .notEmpty().withMessage('Certification code is required')
      .isString().withMessage('Code must be a string')
      .isLength({ min: 2, max: 20 }).withMessage('Code must be between 2 and 20 characters')
      .matches(/^[A-Za-z0-9\-]+$/).withMessage('Code must contain only letters, numbers, and hyphens'),
    
    body('provider')
      .notEmpty().withMessage('Provider is required')
      .isString().withMessage('Provider must be a string')
      .isLength({ min: 2, max: 100 }).withMessage('Provider must be between 2 and 100 characters'),
    
    body('description')
      .optional()
      .isString().withMessage('Description must be a string')
      .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
    
    body('passingScore')
      .notEmpty().withMessage('Passing score is required')
      .isInt({ min: 0, max: 100 }).withMessage('Passing score must be a number between 0 and 100'),
    
    body('timeLimit')
      .notEmpty().withMessage('Time limit is required')
      .isInt({ min: 1 }).withMessage('Time limit must be a positive number (in minutes)')
      .toInt(),
    
    body('domains')
      .isArray().withMessage('Domains must be an array')
      .notEmpty().withMessage('At least one domain is required'),
    
    body('domains.*.name')
      .notEmpty().withMessage('Domain name is required')
      .isString().withMessage('Domain name must be a string'),
    
    // body('domains.*.weight')
    //   .notEmpty().withMessage('Domain weight is required')
    //   .isInt({ min: 1, max: 100 }).withMessage('Domain weight must be between 1 and 100')
    //   .toInt()
  ];
  

