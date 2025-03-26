const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const { authorizeRoles } = require ('../middleware/auth');

const router = express.Router();


router.get('', authorizeRoles(['admin', 'user']), leaderboardController.getLeaderboard);

router.get('/users/:userId/rank', authorizeRoles(['admin', 'user']), leaderboardController.getUserRank);

router.get('/detailed', authorizeRoles(['admin', 'user']), leaderboardController.getDetailedLeaderboard);

router.post('/refresh',  leaderboardController.refreshLeaderboard);


module.exports = router;