const LeaderboardEntry = require('../models/leaderboard');
const User = require('../models/user');
const Attempt = require('../models/attempt');
const Certification = require('../models/certification');

/**
 * Update leaderboard for a user
 * @param {string} userId - User ID
 */
exports.updateUserLeaderboard = async (userId) => {
  try {
    // Get user details
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Update the global leaderboard entry
    await updateGlobalEntry(userId, user.username);
    
    // Get all certifications the user has attempted
    const attemptedCertifications = await Attempt.distinct('certificationId', { 
      userId, 
      completed: true 
    });
    
    // Update certification-specific leaderboard entries
    for (const certId of attemptedCertifications) {
      await updateCertificationEntry(userId, user.username, certId);
    }
    
    // Update weekly and monthly entries
    await updateTimeFrameEntries(userId, user.username);
  } catch (error) {
    console.error('Error updating user leaderboard:', error);
    throw error;
  }
};

/**
 * Update global leaderboard entry for a user
 */
async function updateGlobalEntry(userId, username) {
  try {
    // Calculate user's overall stats
    const userAttempts = await Attempt.find({ 
      userId, 
      completed: true 
    });
    
    if (userAttempts.length === 0) {
      return; // No attempts, nothing to update
    }
    
    // Calculate average score
    const totalScore = userAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0);
    const averageScore = totalScore / userAttempts.length;
    
    // Count certifications passed
    const passedCertMap = {};
    userAttempts.forEach(attempt => {
      if (attempt.passed && attempt.certificationId) {
        passedCertMap[attempt.certificationId.toString()] = true;
      }
    });
    
    const certsPassed = Object.keys(passedCertMap).length;
    
    // Update or create global leaderboard entry
    await LeaderboardEntry.findOneAndUpdate(
      { 
        userId,
        timeframe: 'allTime',
        certificationId: null // null for global
      },
      {
        username,
        score: averageScore * (1 + (userAttempts.length * 0.01)), // Score formula that rewards both accuracy and activity
        examsCompleted: userAttempts.length,
        averageScore,
        certsPassed,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    
    // Recalculate ranks for global leaderboard
    await recalculateRanks(null, 'allTime');
  } catch (error) {
    console.error('Error updating global leaderboard entry:', error);
    throw error;
  }
}

/**
 * Update certification-specific leaderboard entry for a user
 */
async function updateCertificationEntry(userId, username, certificationId) {
  try {
    // Get attempts for this certification
    const certAttempts = await Attempt.find({
      userId,
      certificationId,
      completed: true
    });
    
    if (certAttempts.length === 0) {
      return; // No attempts for this certification
    }
    
    // Calculate average score
    const totalScore = certAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0);
    const averageScore = totalScore / certAttempts.length;
    
    // Check if user has passed this certification
    const hasPassed = certAttempts.some(attempt => attempt.passed);
    
    // Update or create certification leaderboard entry
    await LeaderboardEntry.findOneAndUpdate(
      {
        userId,
        timeframe: 'allTime',
        certificationId
      },
      {
        username,
        score: averageScore * (1 + (certAttempts.length * 0.01)), // Score formula
        examsCompleted: certAttempts.length,
        averageScore,
        certsPassed: hasPassed ? 1 : 0,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    
    // Recalculate ranks for this certification's leaderboard
    await recalculateRanks(certificationId, 'allTime');
  } catch (error) {
    console.error('Error updating certification leaderboard entry:', error);
    throw error;
  }
}

/**
 * Update weekly and monthly leaderboard entries
 */
async function updateTimeFrameEntries(userId, username) {
  try {
    const now = new Date();
    
    // Define time frames
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    
    // Get weekly attempts
    const weeklyAttempts = await Attempt.find({
      userId,
      completed: true,
      endTime: { $gte: weekStart }
    });
    
    // Get monthly attempts
    const monthlyAttempts = await Attempt.find({
      userId,
      completed: true,
      endTime: { $gte: monthStart }
    });
    
    // Update weekly leaderboard
    if (weeklyAttempts.length > 0) {
      const weeklyScore = weeklyAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0) / weeklyAttempts.length;
      
      // Count weekly certifications passed
      const weeklyPassedCertMap = {};
      weeklyAttempts.forEach(attempt => {
        if (attempt.passed && attempt.certificationId) {
          weeklyPassedCertMap[attempt.certificationId.toString()] = true;
        }
      });
      
      await LeaderboardEntry.findOneAndUpdate(
        {
          userId,
          timeframe: 'weekly',
          certificationId: null
        },
        {
          username,
          score: weeklyScore * (1 + (weeklyAttempts.length * 0.01)),
          examsCompleted: weeklyAttempts.length,
          averageScore: weeklyScore,
          certsPassed: Object.keys(weeklyPassedCertMap).length,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
      
      await recalculateRanks(null, 'weekly');
    }
    
    // Update monthly leaderboard
    if (monthlyAttempts.length > 0) {
      const monthlyScore = monthlyAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0) / monthlyAttempts.length;
      
      // Count monthly certifications passed
      const monthlyPassedCertMap = {};
      monthlyAttempts.forEach(attempt => {
        if (attempt.passed && attempt.certificationId) {
          monthlyPassedCertMap[attempt.certificationId.toString()] = true;
        }
      });
      
      await LeaderboardEntry.findOneAndUpdate(
        {
          userId,
          timeframe: 'monthly',
          certificationId: null
        },
        {
          username,
          score: monthlyScore * (1 + (monthlyAttempts.length * 0.01)),
          examsCompleted: monthlyAttempts.length,
          averageScore: monthlyScore,
          certsPassed: Object.keys(monthlyPassedCertMap).length,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
      
      await recalculateRanks(null, 'monthly');
    }
  } catch (error) {
    console.error('Error updating time frame leaderboard entries:', error);
    throw error;
  }
}

/**
 * Recalculate ranks for a specific leaderboard
 */
async function recalculateRanks(certificationId, timeframe) {
  try {
    // Find all entries for this leaderboard
    const query = { timeframe };
    if (certificationId !== undefined) {
      query.certificationId = certificationId;
    }
    
    // Sort by score (descending)
    const entries = await LeaderboardEntry.find(query).sort({ score: -1 });
    
    // Update ranks
    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
      await entries[i].save();
    }
  } catch (error) {
    console.error('Error recalculating ranks:', error);
    throw error;
  }
}

/**
 * Get leaderboard data
 * @param {object} options - Options for retrieving leaderboard
 */
exports.getLeaderboard = async (options = {}) => {
  try {
    const { 
      certificationId = null,
      timeframe = 'allTime',
      limit = 10,
      includeUser = null
    } = options;
    
    // Build query
    const query = { timeframe };
    if (certificationId) {
      query.certificationId = certificationId;
    } else {
      query.certificationId = null; // Global leaderboard
    }
    
    // Get top entries
    let leaderboard = await LeaderboardEntry.find(query)
      .sort({ score: -1 })
      .limit(limit);
    
    // If includeUser is specified, check if the user is already in the leaderboard
    if (includeUser) {
      const userInLeaderboard = leaderboard.some(entry => entry.userId.toString() === includeUser);
      
      // If user is not in the leaderboard, get their entry and add it
      if (!userInLeaderboard) {
        const userEntry = await LeaderboardEntry.findOne({
          ...query,
          userId: includeUser
        });
        
        if (userEntry) {
          leaderboard.push(userEntry);
        }
      }
    }
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

/**
 * Get a user's rank on the leaderboard
 * @param {string} userId - User ID
 * @param {string} certificationId - Optional certification ID
 * @param {string} timeframe - Optional time frame
 */
exports.getUserRank = async (userId, certificationId = null, timeframe = 'allTime') => {
  try {
    const entry = await LeaderboardEntry.findOne({
      userId,
      certificationId,
      timeframe
    });
    
    if (!entry) {
      return null;
    }
    
    return {
      rank: entry.rank,
      score: entry.score,
      examsCompleted: entry.examsCompleted,
      averageScore: entry.averageScore,
      certsPassed: entry.certsPassed
    };
  } catch (error) {
    console.error('Error getting user rank:', error);
    throw error;
  }
};

/**
 * Refresh the entire leaderboard
 * This should be run periodically (e.g., daily)
 */
exports.refreshLeaderboard = async () => {
  try {
    // Clear existing weekly/monthly entries that are out of date
    const now = new Date();
    
    // Define time frames
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    
    // Remove outdated weekly entries
    await LeaderboardEntry.deleteMany({
      timeframe: 'weekly',
      lastUpdated: { $lt: weekStart }
    });
    
    // Remove outdated monthly entries
    await LeaderboardEntry.deleteMany({
      timeframe: 'monthly',
      lastUpdated: { $lt: monthStart }
    });
    
    // Get all users
    const users = await User.find();
    
    // Update leaderboard for each user
    for (const user of users) {
      await exports.updateUserLeaderboard(user._id);
    }
    
    return { success: true, usersUpdated: users.length };
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    throw error;
  }
};