const User = require('../models/user');
const Certification = require('../models/certification');
const leaderboardService = require('../services/leaderBoardService');

/**
 * Get leaderboard
 */
exports.getLeaderboard = async (req, res) => {
  try {
    const certificationId = req.query.certificationId || null;
    const timeframe = req.query.timeframe || 'allTime';
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate certification if provided
    if (certificationId) {
      const certification = await Certification.findById(certificationId);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certification not found'
        });
      }
    }
    
    // Validate timeframe
    const validTimeframes = ['weekly', 'monthly', 'allTime'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be one of: weekly, monthly, allTime'
      });
    }
    
    // Get leaderboard data
    const includeUser = req.query.includeUser === 'true' ? req.user._id : null;
    
    const leaderboard = await leaderboardService.getLeaderboard({
      certificationId,
      timeframe,
      limit,
      includeUser
    });
    
    return res.status(200).json({
        success: true,
        data: leaderboard,
    });
  } catch (err) {
    console.error('Error getting leaderboard:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard data',
    });
  }
};

/**
 * Get user rank
 */
exports.getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;
    const certificationId = req.query.certificationId || null;
    const timeframe = req.query.timeframe || 'allTime';
    
    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Validate certification if provided
    if (certificationId) {
      const certification = await Certification.findById(certificationId);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certification not found'
        });
      }
    }
    
    // Validate timeframe
    const validTimeframes = ['weekly', 'monthly', 'allTime'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be one of: weekly, monthly, allTime'
      });
    }
    
    // Get rank
    const rankData = await leaderboardService.getUserRank(userId, certificationId, timeframe);
    
    if (!rankData) {
      return res.status(404).json({
        success: false,
        message: 'User has no leaderboard entry for the specified parameters'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        userId,
        username: user.username,
        ...rankData
      }
    });
  } catch (err) {
    console.error('Error getting user rank:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user rank',
      error: err.message
    });
  }
};

/**
 * Get detailed leaderboard with pagination
 */
exports.getDetailedLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const certificationId = req.query.certificationId || null;
    const timeframe = req.query.timeframe || 'allTime';
    
    // Validate certification if provided
    if (certificationId) {
      const certification = await Certification.findById(certificationId);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certification not found'
        });
      }
    }
    
    // Validate timeframe
    const validTimeframes = ['weekly', 'monthly', 'allTime'];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be one of: weekly, monthly, allTime'
      });
    }
    
    // Build query
    const query = { timeframe };
    if (certificationId) {
      query.certificationId = certificationId;
    } else {
      query.certificationId = null; // Global leaderboard
    }
    
    // Get entry count for pagination
    const totalEntries = await LeaderboardEntry.countDocuments(query);
    
    // Calculate skip
    const skip = (page - 1) * limit;
    
    // Get leaderboard entries
    const entries = await LeaderboardEntry.find(query)
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit);
    
    // Get user rank if logged in
    let userRank = null;
    if (req.user) {
      userRank = await leaderboardService.getUserRank(req.user._id, certificationId, timeframe);
    }
    
    return res.status(200).json({
      success: true,
      data: entries,
      userRank,
      pagination: {
        page,
        limit,
        totalEntries,
        totalPages: Math.ceil(totalEntries / limit)
      }
    });
  } catch (err) {
    console.error('Error getting detailed leaderboard:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get detailed leaderboard data',
      error: err.message
    });
  }
};

/**
 * Manually refresh leaderboard (admin only)
 */
exports.refreshLeaderboard = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Admin access required'
      });
    }
    
    const result = await leaderboardService.refreshLeaderboard();
    
    return res.status(200).json({
      success: true,
      message: 'Leaderboard refreshed successfully',
      data: result
    });
  } catch (err) {
    console.error('Error refreshing leaderboard:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh leaderboard',
    });
  }
};