const { validationResult, } = require('express-validator');

exports.handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorSummaryMessage = errors.array().map((err) => err.msg).join('; ');
      return res.status(400).json({ success: false, message: errorSummaryMessage });
    }
    next();
  }