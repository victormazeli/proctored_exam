const Badge = require('../models/badge');
const UserBadge = require('../models/userBadge');
const User = require('../models/user');
const Attempt = require('../models/attempt');

/**
 * Get all badges
 */
exports.getAllBadges = async () => {
  try {
    return await Badge.find({ active: true }).sort({ category: 1, name: 1 });
  } catch (error) {
    console.error('Error getting all badges:', error);
    throw error;
  }
};

/**
 * Get badges for a specific user
 * @param {string} userId - User ID
 */
exports.getUserBadges = async (userId) => {
  try {
    const userBadges = await UserBadge.find({ userId }).sort({ earnedDate: -1 });
    
    // Get badge details for each user badge
    const badgeIds = userBadges.map(ub => ub.badgeId);
    const badges = await Badge.find({ id: { $in: badgeIds } });
    
    // Create a map for easier lookup
    const badgeMap = {};
    badges.forEach(badge => {
      badgeMap[badge.id] = badge;
    });
    
    // Combine user badge data with badge details
    return userBadges.map(userBadge => ({
      id: userBadge.badgeId,
      name: badgeMap[userBadge.badgeId]?.name || 'Unknown Badge',
      description: badgeMap[userBadge.badgeId]?.description || '',
      icon: badgeMap[userBadge.badgeId]?.icon || '/assets/badges/default.svg',
      earnedDate: userBadge.earnedDate,
      category: badgeMap[userBadge.badgeId]?.category || 'achievement',
      ...userBadge.metadata
    }));
  } catch (error) {
    console.error('Error getting user badges:', error);
    throw error;
  }
};

/**
 * Check and award badges for a user based on an exam attempt
 * @param {string} userId - User ID
 * @param {string} attemptId - Attempt ID
 */
exports.checkAndAwardBadges = async (userId, attemptId) => {
  try {
    // Get attempt details
    const attempt = await Attempt.findById(attemptId)
      .populate('certificationId')
      .populate('examId');
    
    if (!attempt) {
      throw new Error('Attempt not found');
    }
    
    // Get user data
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get previously earned badges to avoid duplicates
    const userBadges = await UserBadge.find({ userId });
    const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
    
    // Array to store badges to be awarded
    const badgesToAward = [];
    
    // Check badge criteria and add badges to award
    
    // First Attempt Badge
    if (!earnedBadgeIds.includes('first_attempt')) {
      badgesToAward.push({
        badgeId: 'first_attempt',
        metadata: {
          examName: attempt.examId.name
        }
      });
    }
    
    // Perfect Score Badge
    if (!earnedBadgeIds.includes('perfect_score') && attempt.score.overall === 100) {
      badgesToAward.push({
        badgeId: 'perfect_score',
        metadata: {
          examName: attempt.examId.name,
          score: attempt.score.overall
        }
      });
    }
    
    // Check for Improvement Badge
    await checkForImprovementBadge(userId, attempt, earnedBadgeIds, badgesToAward);
    
    // Check for Certification Ready Badge
    await checkForCertReadyBadge(userId, attempt, earnedBadgeIds, badgesToAward);
    
    // Check for Fast Finish Badge
    const examTimeLimit = attempt.examId.timeLimit * 60 * 1000; // Convert minutes to ms
    const attemptDuration = attempt.endTime - attempt.startTime;
    
    if (!earnedBadgeIds.includes('fast_finish') && 
        attemptDuration < (examTimeLimit * 0.5) && // Completed in less than 50% of allowed time
        attempt.score.overall >= 80) { // With at least 80% score
      badgesToAward.push({
        badgeId: 'fast_finish',
        metadata: {
          examName: attempt.examId.name,
          duration: Math.round(attemptDuration / 60000), // Convert to minutes
          timeLimit: attempt.examId.timeLimit
        }
      });
    }
    
    // Check for streak badges
    await checkForStreakBadge(userId, earnedBadgeIds, badgesToAward);
    
    // Award badges
    for (const badge of badgesToAward) {
      await UserBadge.create({
        userId,
        badgeId: badge.badgeId,
        earnedDate: new Date(),
        metadata: badge.metadata
      });
    }
    
    return badgesToAward.map(b => b.badgeId);
  } catch (error) {
    console.error('Error checking and awarding badges:', error);
    throw error;
  }
};

/**
 * Check for improvement badge
 */
async function checkForImprovementBadge(userId, attempt, earnedBadgeIds, badgesToAward) {
  if (earnedBadgeIds.includes('improvement_10')) {
    return;
  }
  
  // Get previous attempts for the same exam
  const previousAttempts = await Attempt.find({
    userId,
    examId: attempt.examId,
    _id: { $ne: attempt._id }, // Exclude current attempt
    completed: true
  }).sort({ endTime: -1 });
  
  if (previousAttempts.length > 0) {
    // Get the best previous score
    const bestPreviousScore = Math.max(...previousAttempts.map(a => a.score.overall));
    
    // Calculate improvement
    const improvement = attempt.score.overall - bestPreviousScore;
    
    if (improvement >= 10) {
      badgesToAward.push({
        badgeId: 'improvement_10',
        metadata: {
          examName: attempt.examId.name,
          improvement: improvement.toFixed(1),
          previousScore: bestPreviousScore.toFixed(1),
          newScore: attempt.score.overall.toFixed(1)
        }
      });
    }
  }
}

/**
 * Check for certification ready badge
 */
async function checkForCertReadyBadge(userId, attempt, earnedBadgeIds, badgesToAward) {
  if (earnedBadgeIds.includes('cert_ready')) {
    return;
  }
  
  // If the attempt score is greater than or equal to certification passing score
  if (attempt.passed && 
      attempt.certificationId && 
      attempt.score.overall >= attempt.certificationId.passingScore) {
    
    // Get the last 3 attempts for this certification
    const recentAttempts = await Attempt.find({
      userId,
      certificationId: attempt.certificationId._id,
      completed: true
    }).sort({ endTime: -1 }).limit(3);
    
    // Check if all recent attempts are passing scores
    if (recentAttempts.length >= 3 && 
        recentAttempts.every(a => a.score.overall >= attempt.certificationId.passingScore)) {
      badgesToAward.push({
        badgeId: 'cert_ready',
        metadata: {
          certificationName: attempt.certificationId.name,
          passingScore: attempt.certificationId.passingScore,
          consecutivePasses: recentAttempts.length
        }
      });
    }
  }
}

/**
 * Check for streak badge
 */
async function checkForStreakBadge(userId, earnedBadgeIds, badgesToAward) {
  if (earnedBadgeIds.includes('streak_3')) {
    return;
  }
  
  // Get current day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get yesterday and the day before
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  // Check if there are attempts on these three consecutive days
  const todayAttempt = await Attempt.findOne({
    userId,
    startTime: { $gte: today },
    completed: true
  });
  
  const yesterdayAttempt = await Attempt.findOne({
    userId,
    startTime: { $gte: yesterday, $lt: today },
    completed: true
  });
  
  const twoDaysAgoAttempt = await Attempt.findOne({
    userId,
    startTime: { $gte: twoDaysAgo, $lt: yesterday },
    completed: true
  });
  
  if (todayAttempt && yesterdayAttempt && twoDaysAgoAttempt) {
    badgesToAward.push({
      badgeId: 'streak_3',
      metadata: {
        streakDays: 3,
        startDate: twoDaysAgo,
        endDate: today
      }
    });
  }
}