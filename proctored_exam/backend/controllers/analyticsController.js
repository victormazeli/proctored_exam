const User = require('../models/user');
const Attempt = require('../models/attempt');
const Certification = require('../models/certification');
const Exam = require('../models/exam');
const Question = require('../models/question');
const analyticsService = require('../services/analyticService');
const Badge = require('../models/badge');
const UserBadge = require('../models/userBadge');
const badgeService = require('../services/badgeService');

/**
 * Get user attempts summary
 */
exports.getUserAttemptsSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    
    // Get all completed attempts
    const attempts = await Attempt.find({
      userId,
      completed: true
    });
    
    // Calculate summary
    const totalAttempts = attempts.length;
    const passCount = attempts.filter(a => a.passed).length;
    
    // Calculate average score
    let averageScore = 0;
    if (totalAttempts > 0) {
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score.overall, 0);
      averageScore = totalScore / totalAttempts;
    }
    
    return res.status(200).json({
      success: true,
      data: {
        averageScore,
        totalAttempts,
        passCount
      }
    });
  } catch (err) {
    console.error('Error getting user attempts summary:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get attempts summary',
    });
  }
};

/**
 * Get weekly stats for user
 */
exports.getWeeklyStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and access permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    
    // Get current date and start of current week
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Get previous week start
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    
    // Get attempts from current week
    const currentWeekAttempts = await Attempt.find({
      userId,
      completed: true,
      endTime: { $gte: currentWeekStart }
    });
    
    // Get attempts from previous week
    const previousWeekAttempts = await Attempt.find({
      userId,
      completed: true,
      endTime: { $gte: previousWeekStart, $lt: currentWeekStart }
    });
    
    // Calculate current week stats
    const attempts = currentWeekAttempts.length;
    let averageScore = 0;
    if (attempts > 0) {
      const totalScore = currentWeekAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0);
      averageScore = totalScore / attempts;
    }
    
    // Calculate previous week's average score for improvement
    let previousAverageScore = 0;
    if (previousWeekAttempts.length > 0) {
      const previousTotalScore = previousWeekAttempts.reduce((sum, attempt) => sum + attempt.score.overall, 0);
      previousAverageScore = previousTotalScore / previousWeekAttempts.length;
    }
    
    // Calculate improvement percentage
    const improvement = previousAverageScore > 0 ? averageScore - previousAverageScore : 0;
    
    // Calculate study time (assuming average 30 minutes per attempt + any additional time logged)
    // This is just an example - actual study time calculation would depend on your data model
    const studyTimeHours = Math.round((attempts * 0.5) * 10) / 10; // Round to 1 decimal place
    
    return res.status(200).json({
      success: true,
      data: {
        attempts,
        improvement,
        averageScore,
        studyTimeHours,
        weekStart: currentWeekStart
      }
    });
  } catch (err) {
    console.error('Error getting weekly stats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get weekly stats',
    });
  }
};

/**
 * Get certification progress for user
 */
exports.getUserCertificationProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and access permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    
    // Get all certifications
    const certifications = await Certification.find({ active: true });
    
    // Get all attempts grouped by certification
    const certificationProgress = [];
    
    for (const certification of certifications) {
      // Get attempts for this certification
      const attempts = await Attempt.find({
        userId,
        certificationId: certification._id,
        completed: true
      });
      
      if (attempts.length === 0) {
        continue; // Skip certifications with no attempts
      }
      
      // Calculate best score
      const bestScore = Math.max(...attempts.map(a => a.score.overall));
      
      // Calculate average score
      const totalScore = attempts.reduce((sum, a) => sum + a.score.overall, 0);
      const averageScore = totalScore / attempts.length;
      
      // Calculate progress percentage (based on best score compared to passing score)
      const progress = Math.min(100, Math.round((bestScore / certification.passingScore) * 100));
      
      certificationProgress.push({
        _id: certification._id,
        name: certification.name,
        code: certification.code,
        attempts: attempts.length,
        bestScore,
        averageScore,
        progress,
        passingScore: certification.passingScore
      });
    }
    
    // Sort by progress (descending)
    certificationProgress.sort((a, b) => b.progress - a.progress);
    
    return res.status(200).json({
      success: true,
      data: certificationProgress
    });
  } catch (err) {
    console.error('Error getting certification progress:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get certification progress',
    });
  }
};

/**
 * Get user badges
 */
exports.getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and access permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    
    // Get user badges
    const badges = await badgeService.getUserBadges(userId);
    
    return res.status(200).json({
      success: true,
      data: badges
    });
  } catch (err) {
    console.error('Error getting user badges:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user badges',
    });
  }
};

/**
 * Get recent attempts
 */
exports.getRecentAttempts = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    // Verify user exists and access permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
  
    // Get recent attempts
    const attempts = await Attempt.find({
      userId,
      completed: true
    })
    .sort({ endTime: -1 })
    .limit(limit)
    .populate('examId', 'name')
    .populate('certificationId', 'name');
    
    // Format data for the frontend
    const formattedAttempts = attempts.map(attempt => ({
      _id: attempt._id,
      examName: attempt.examId ? attempt.examId.name : 'Unknown Exam',
      certificationName: attempt.certificationId ? attempt.certificationId.name : 'Unknown Certification',
      date: attempt.endTime,
      score: attempt.score.overall,
      passed: attempt.passed
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedAttempts
    });
  } catch (err) {
    console.error('Error getting recent attempts:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get recent attempts',
    });
  }
};

/**
 * Get personalized recommendations
 */
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists and access permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    
    // Get all attempts
    const attempts = await Attempt.find({
      userId,
      completed: true
    })
    .populate('certificationId')
    .populate('examId');
    
    if (attempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Analyze weak areas (domains with lowest scores)
    const domainScores = {};
    
    attempts.forEach(attempt => {
      if (!attempt.score.byDomain) return;
      
      attempt.score.byDomain.forEach(domain => {
        if (!domainScores[domain.domain]) {
          domainScores[domain.domain] = {
            scores: [],
            certificationId: attempt.certificationId ? attempt.certificationId._id : null,
            certificationName: attempt.certificationId ? attempt.certificationId.name : 'Unknown'
          };
        }
        
        domainScores[domain.domain].scores.push(domain.score);
      });
    });
    
    // Calculate average scores for each domain
    Object.keys(domainScores).forEach(domain => {
      const scores = domainScores[domain].scores;
      domainScores[domain].averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });
    
    // Sort domains by average score (ascending)
    const sortedDomains = Object.keys(domainScores).sort(
      (a, b) => domainScores[a].averageScore - domainScores[b].averageScore
    );
    
    // Generate recommendations for the weakest domains
    const recommendations = [];
    const weakestDomains = sortedDomains.slice(0, 3); // Get top 3 weakest domains
    
    weakestDomains.forEach(domain => {
      if (domainScores[domain].averageScore < 70) { // Only recommend if below 70%
        recommendations.push({
          title: `Improve your knowledge in ${domain}`,
          description: `Your average score in this domain is ${domainScores[domain].averageScore.toFixed(1)}%. Focus on strengthening your understanding of key concepts.`,
          certificationId: domainScores[domain].certificationId,
          certificationName: domainScores[domain].certificationName,
          domainName: domain,
          priority: 'high'
        });
      }
    });
    
    // Add general recommendation if few attempts
    if (attempts.length < 5) {
      recommendations.push({
        title: 'Practice More Exams',
        description: 'You\'ve completed only a few practice exams. Regular practice is key to success in certification exams.',
        priority: 'medium'
      });
    }
    
    // Add specific exam recommendation if available
    const latestAttempt = attempts.sort((a, b) => b.endTime - a.endTime)[0];
    if (latestAttempt && !latestAttempt.passed) {
      recommendations.push({
        title: 'Retry Your Recent Exam',
        description: `You scored ${latestAttempt.score.overall.toFixed(1)}% on ${latestAttempt.examId ? latestAttempt.examId.name : 'your recent exam'}. Review your answers and try again to improve.`,
        examId: latestAttempt.examId ? latestAttempt.examId._id : null,
        priority: 'high'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (err) {
    console.error('Error getting personalized recommendations:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
    });
  }
};

/**
 * Get admin analytics dashboard data
 */
exports.getAdminAnalytics = async (req, res) => {
  try {
    // Get query parameters
    const { 
      dateRange = '30',  // Default to 30 days
      groupBy = 'day',   // Default to daily grouping
      certificationId = 'all' // Default to all certifications
    } = req.query;
    
    const days = parseInt(dateRange);
    
    // Get exam performance data
    const examPerformance = await analyticsService.getExamPerformance(
      certificationId !== 'all' ? certificationId : null,
      days
    );
    
    // Get attempts trend over time
    const timeTrendData = await analyticsService.getAttemptsByTimePeriod(
      groupBy, 
      days
    );
    
    // Get certification pass rates
    const certPassRates = await analyticsService.getCertificationPassRates(days);
    
    // Get recent attempts with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const attemptsQuery = {
      completed: true
    };
    
    // Apply certification filter if specified
    if (certificationId !== 'all') {
      attemptsQuery.certificationId = certificationId;
    }
    
    // Apply search filter if provided
    if (search) {
      attemptsQuery.$or = [
        { 'userId.username': { $regex: search, $options: 'i' } },
        { 'examId.name': { $regex: search, $options: 'i' } },
        { 'certificationId.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate how far back to look based on date range
    if (days > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      attemptsQuery.endTime = { $gte: startDate };
    }
    
    // Get attempts with pagination
    const skip = (page - 1) * limit;
    
    const recentAttempts = await Attempt.find(attemptsQuery)
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username email')
      .populate('examId', 'name')
      .populate('certificationId', 'name');
    
    // Get total count for pagination
    const totalAttempts = await Attempt.countDocuments(attemptsQuery);
    
    // Calculate overview stats
    const overviewStats = calculateOverviewStats(examPerformance);
    
    // Get all certifications for filter
    const certifications = await Certification.find({ active: true })
      .select('_id name');
    
    return res.status(200).json({
      success: true,
      data: {
        examPerformance,
        timeTrendData,
        certPassRates,
        recentAttempts,
        overviewStats,
        certifications,
        pagination: {
          total: totalAttempts,
          page,
          limit,
          pages: Math.ceil(totalAttempts / limit)
        }
      }
    });
  } catch (err) {
    console.error('Error getting admin analytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get analytics data',
      error: err.message
    });
  }
};

/**
 * Calculate overview statistics from exam performance data
 * @param {Array} examPerformance - Exam performance data
 * @returns {Object} Overview statistics
 */
function calculateOverviewStats(examPerformance) {
  if (!examPerformance || examPerformance.length === 0) {
    return {
      totalAttempts: 0,
      passCount: 0,
      passRate: 0,
      averageScore: 0,
      averageDurationMin: 0
    };
  }
  
  let totalAttempts = 0;
  let totalPasses = 0;
  let totalScore = 0;
  let totalDuration = 0;
  
  examPerformance.forEach(exam => {
    totalAttempts += exam.totalAttempts;
    totalPasses += exam.passCount;
    totalScore += exam.avgScore * exam.totalAttempts;
    totalDuration += exam.avgDurationMinutes * exam.totalAttempts;
  });
  
  return {
    totalAttempts,
    passCount: totalPasses,
    passRate: totalAttempts > 0 ? (totalPasses / totalAttempts) * 100 : 0,
    averageScore: totalAttempts > 0 ? totalScore / totalAttempts : 0,
    averageDurationMin: totalAttempts > 0 ? Math.round(totalDuration / totalAttempts) : 0
  };
}

/**
 * Get certification analytics data
 */
exports.getCertificationAnalytics = async (req, res) => {
  try {
    // Get query parameters
    const { 
      dateRange = '30',      // Default to 30 days
      certificationId = 'all' // Default to all certifications
    } = req.query;
    
    const days = parseInt(dateRange);
    
    // Get certification pass rates
    let certPassRates = await analyticsService.getCertificationPassRates(days);
    
    // Filter by certification if specified
    if (certificationId !== 'all') {
      certPassRates = certPassRates.filter(cert => 
        cert._id.toString() === certificationId
      );
    }
    
    // Get monthly trends
    const monthlyTrends = await getCertificationMonthlyTrends(
      certificationId !== 'all' ? certificationId : null,
      days
    );
    
    // Get question performance
    const questionPerformance = await getQuestionPerformance(
      certificationId !== 'all' ? certificationId : null,
      days
    );
    
    // Get score distribution
    const scoreDistribution = await getScoreDistribution(
      certificationId !== 'all' ? certificationId : null,
      days
    );
    
    // Get duration distribution
    const durationDistribution = await getDurationDistribution(
      certificationId !== 'all' ? certificationId : null,
      days
    );
    
    // Get top performers
    const topPerformers = await getTopPerformers(
      certificationId !== 'all' ? certificationId : null,
      days,
      10 // Limit to top 10
    );
    
    // Get all certifications for filter
    const certifications = await Certification.find({ active: true })
      .select('_id name');
    
    return res.status(200).json({
      success: true,
      data: {
      certPassRates,
      monthlyTrends,
      questionPerformance,
      scoreDistribution,
      durationDistribution,
      topPerformers,
      certifications
      }
    });
  } catch (err) {
    console.error('Error getting certification analytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get certification analytics data',
      error: err.message
    });
  }
};

/**
 * Get certification monthly trends
 * @param {string|null} certificationId - Certification ID or null for all
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Monthly trend data
 */
async function getCertificationMonthlyTrends(certificationId, days) {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Prepare match query
    const matchQuery = {
      completed: true,
      endTime: { $gte: startDate }
    };
    
    if (certificationId) {
      matchQuery.certificationId = mongoose.Types.ObjectId(certificationId);
    }
    
    // Aggregate monthly data
    const monthlyData = await Attempt.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            year: { $year: '$endTime' },
            month: { $month: '$endTime' },
            certificationId: '$certificationId'
          },
          attempts: { $sum: 1 },
          passes: {
            $sum: {
              $cond: [{ $eq: ['$passed', true] }, 1, 0]
            }
          },
          avgScore: { $avg: '$score.overall' }
        }
      },
      {
        $lookup: {
          from: 'certifications',
          localField: '_id.certificationId',
          foreignField: '_id',
          as: 'certDetails'
        }
      },
      {
        $unwind: '$certDetails'
      },
      {
        $project: {
          _id: 0,
          certificationId: '$_id.certificationId',
          certificationName: '$certDetails.name',
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: {
                $dateFromParts: {
                  'year': '$_id.year',
                  'month': '$_id.month',
                  'day': 1
                }
              }
            }
          },
          attempts: 1,
          passes: 1,
          passRate: {
            $multiply: [
              { $divide: ['$passes', { $max: ['$attempts', 1] }] },
              100
            ]
          },
          avgScore: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);
    
    return monthlyData;
  } catch (error) {
    console.error('Error getting certification monthly trends:', error);
    throw error;
  }
}

/**
 * Get question performance data
 * @param {string|null} certificationId - Certification ID or null for all
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Question performance data
 */
async function getQuestionPerformance(certificationId, days) {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build match query
    const matchQuery = {
      completed: true,
      endTime: { $gte: startDate }
    };
    
    if (certificationId) {
      matchQuery.certificationId = mongoose.Types.ObjectId(certificationId);
    }
    
    // Get attempts
    const attempts = await Attempt.find(matchQuery)
      .select('responses')
      .lean();
    
    // Extract question data from responses
    const questionData = {};
    
    attempts.forEach(attempt => {
      if (!attempt.responses || !Array.isArray(attempt.responses)) return;
      
      attempt.responses.forEach(response => {
        if (!response.questionId) return;
        
        const questionId = response.questionId.toString();
        
        if (!questionData[questionId]) {
          questionData[questionId] = {
            questionId,
            attempts: 0,
            correct: 0
          };
        }
        
        questionData[questionId].attempts++;
        if (response.isCorrect) {
          questionData[questionId].correct++;
        }
      });
    });
    
    // Convert to array and calculate success rate
    const questionPerformanceData = Object.values(questionData).map(q => ({
      ...q,
      successRate: (q.correct / q.attempts) * 100
    }));
    
    // Sort by success rate (ascending - most problematic first)
    questionPerformanceData.sort((a, b) => a.successRate - b.successRate);
    
    // Get question details for the top problematic questions (limit to 50)
    const topQuestionIds = questionPerformanceData
      .slice(0, 50)
      .map(q => mongoose.Types.ObjectId(q.questionId));
    
    if (topQuestionIds.length === 0) {
      return [];
    }
    
    const questions = await Question.find({
      _id: { $in: topQuestionIds }
    })
    .select('text category difficulty')
    .lean();
    
    // Create a map for quick lookups
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q._id.toString()] = q;
    });
    
    // Combine performance data with question details
    return questionPerformanceData
      .filter(q => questionMap[q.questionId])
      .map(q => ({
        _id: q.questionId,
        text: questionMap[q.questionId].text,
        category: questionMap[q.questionId].category,
        difficulty: questionMap[q.questionId].difficulty,
        attempts: q.attempts,
        successCount: q.correct,
        successRate: q.successRate
      }))
      .slice(0, 20); // Return the top 20 problematic questions
  } catch (error) {
    console.error('Error getting question performance:', error);
    throw error;
  }
}

/**
 * Get score distribution
 * @param {string|null} certificationId - Certification ID or null for all
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Score distribution data
 */
async function getScoreDistribution(certificationId, days) {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build match query
    const matchQuery = {
      completed: true,
      endTime: { $gte: startDate }
    };
    
    if (certificationId) {
      matchQuery.certificationId = mongoose.Types.ObjectId(certificationId);
    }
    
    // Define score ranges
    const scoreRanges = [
      { min: 0, max: 10, label: '0-10%' },
      { min: 10, max: 20, label: '10-20%' },
      { min: 20, max: 30, label: '20-30%' },
      { min: 30, max: 40, label: '30-40%' },
      { min: 40, max: 50, label: '40-50%' },
      { min: 50, max: 60, label: '50-60%' },
      { min: 60, max: 70, label: '60-70%' },
      { min: 70, max: 80, label: '70-80%' },
      { min: 80, max: 90, label: '80-90%' },
      { min: 90, max: 101, label: '90-100%' }
    ];
    
    // Get attempts
    const attempts = await Attempt.find(matchQuery)
      .select('score.overall')
      .lean();
    
    // Calculate distribution
    const distribution = scoreRanges.map(range => {
      const count = attempts.filter(a => 
        a.score.overall >= range.min && a.score.overall < range.max
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: attempts.length > 0 ? (count / attempts.length) * 100 : 0
      };
    });
    
    return distribution;
  } catch (error) {
    console.error('Error getting score distribution:', error);
    throw error;
  }
}

/**
 * Get duration distribution
 * @param {string|null} certificationId - Certification ID or null for all
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Duration distribution data
 */
async function getDurationDistribution(certificationId, days) {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build match query
    const matchQuery = {
      completed: true,
      endTime: { $gte: startDate }
    };
    
    if (certificationId) {
      matchQuery.certificationId = mongoose.Types.ObjectId(certificationId);
    }
    
    // Get attempts
    const attempts = await Attempt.find(matchQuery)
      .select('startTime endTime')
      .lean();
    
    // Calculate durations in minutes
    const durations = attempts.map(a => {
      const durationMs = new Date(a.endTime) - new Date(a.startTime);
      return Math.round(durationMs / (1000 * 60)); // Convert to minutes
    });
    
    // Define duration ranges (in minutes)
    const durationRanges = [
      { min: 0, max: 15, label: '0-15 min' },
      { min: 15, max: 30, label: '15-30 min' },
      { min: 30, max: 45, label: '30-45 min' },
      { min: 45, max: 60, label: '45-60 min' },
      { min: 60, max: 90, label: '60-90 min' },
      { min: 90, max: 120, label: '90-120 min' },
      { min: 120, max: Number.MAX_SAFE_INTEGER, label: '120+ min' }
    ];
    
    // Calculate distribution
    const distribution = durationRanges.map(range => {
      const count = durations.filter(d => 
        d >= range.min && d < range.max
      ).length;
      
      return {
        range: range.label,
        count,
        percentage: durations.length > 0 ? (count / durations.length) * 100 : 0
      };
    });
    
    return distribution;
  } catch (error) {
    console.error('Error getting duration distribution:', error);
    throw error;
  }
}

/**
 * Get top performers
 * @param {string|null} certificationId - Certification ID or null for all
 * @param {number} days - Number of days to look back
 * @param {number} limit - Number of top performers to return
 * @returns {Promise<Array>} Top performers data
 */
async function getTopPerformers(certificationId, days, limit) {
  try {
    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build match query
    const matchQuery = {
      completed: true,
      endTime: { $gte: startDate }
    };
    
    if (certificationId) {
      matchQuery.certificationId = mongoose.Types.ObjectId(certificationId);
    }
    
    // Aggregate user performance
    const topPerformers = await Attempt.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: '$userId',
          attempts: { $sum: 1 },
          passCount: {
            $sum: {
              $cond: [{ $eq: ['$passed', true] }, 1, 0]
            }
          },
          avgScore: { $avg: '$score.overall' },
          bestScore: { $max: '$score.overall' },
          lastAttempt: { $max: '$endTime' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: '$userDetails.username',
          email: '$userDetails.email',
          attempts: 1,
          passCount: 1,
          avgScore: 1,
          bestScore: 1,
          lastAttempt: 1
        }
      },
      {
        $sort: { bestScore: -1, avgScore: -1 }
      },
      {
        $limit: limit
      }
    ]);
    
    return topPerformers;
  } catch (error) {
    console.error('Error getting top performers:', error);
    throw error;
  }
}

