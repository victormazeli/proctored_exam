
const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authorizeRoles } = require ('../middleware/auth');

const router = express.Router();

router.get('/users/:userId/summary', authorizeRoles(['admin', 'user']), analyticsController.getUserAttemptsSummary);
router.get('/users/:userId/weekly-stats', authorizeRoles(['admin', 'user']), analyticsController.getWeeklyStats);
router.get('/users/:userId/certification-progress', authorizeRoles(['admin', 'user']), analyticsController.getUserCertificationProgress);
router.get('/users/:userId/badges', authorizeRoles(['admin', 'user']), analyticsController.getUserBadges);
router.get('/users/:userId/recent-attempts', authorizeRoles(['admin', 'user']), analyticsController.getRecentAttempts);
router.get('/users/:userId/recommendations', authorizeRoles(['admin', 'user']), analyticsController.getPersonalizedRecommendations);


module.exports = router;
