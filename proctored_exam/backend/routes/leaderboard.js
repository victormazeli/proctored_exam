const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { authorizeRoles } = require ('../middleware/auth');

const router = express.Router();



router.get('/leaderboard', authorizeRoles(['admin', 'user']), leaderboardController.getLeaderboard);

router.get('/leaderboard/users/:userId/rank', authorizeRoles(['admin', 'user']), leaderboardController.getUserRank);

router.get('/leaderboard/detailed', authorizeRoles(['admin', 'user']), leaderboardController.getDetailedLeaderboard);

router.post('/leaderboard/refresh',  leaderboardController.refreshLeaderboard);


module.exports = router;