// controllers/analyticsController.js
const User = require('../models/user');
const Attempt = require('../models/attempt');
const Certification = require('../models/certification');
const analyticsService = require('../services/analyticsService');
const aiService = require('../services/aiService');

/**
 * Get user dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get user's attempts summary
    const attemptSummary = await analyticsService.getUserAttemptsSummary(req.user._id);
    
    // Get user's certification progress
    const certificationProgress = await analyticsService.getUserCertificationProgress(req.user._id);
    
    // Get recent activity
    const recentAttempts = await Attempt.find({
      userId: req.user._id,
      completed: true
    })
    .sort({ endTime: -1 })
    .limit(5)
    .populate('certificationId', 'name code')
    .populate('examId', 'name');
    
    // Get improvement stats
    const improvementStats = await analyticsService.getUserImprovementStats(req.user._id);
    
    // Get recommendations
    const recommendations = await aiService.getPersonalizedRecommendations(req.user._id);
    
    res.render('analytics/dashboard', {
      title: 'My Analytics Dashboard',
      attemptSummary,
      certificationProgress,
      recentAttempts,
      improvementStats,
      recommendations
    });
  } catch (err) {
    console.error('Error loading analytics dashboard:', err);
    req.flash('error_msg', 'Failed to load analytics dashboard');
    res.redirect('/exams/select');
  }
};

/**
 * Get user performance details
 */
exports.getPerformance = async (req, res) => {
  try {
    const { certificationId } = req.params;
    
    // Validate certification if provided
    if (certificationId) {
      const certification = await Certification.findById(certificationId);
      if (!certification) {
        req.flash('error_msg', 'Certification not found');
        return res.redirect('/analytics/dashboard');
      }
    }
    
    // Get time range from query
    const range = req.query.range || 'all';
    let startDate;
    
    switch (range) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }
    
    // Get detailed performance data
    const performanceData = await analyticsService.getUserPerformanceData(
      req.user._id,
      certificationId,
      startDate
    );
    
    // Get domain performance
    const domainPerformance = await analyticsService.getUserDomainPerformance(
      req.user._id,
      certificationId,
      startDate
    );
    
    // Get time management stats
    const timeManagement = await analyticsService.getUserTimeManagement(
      req.user._id,
      certificationId,
      startDate
    );
    
    // Get all certifications for filter
    const certifications = await Certification.find({ active: true })
      .select('name code');
    
    res.render('analytics/performance', {
      title: 'Performance Analysis',
      performanceData,
      domainPerformance,
      timeManagement,
      certifications,
      selectedCertification: certificationId,
      range
    });
  } catch (err) {
    console.error('Error loading performance data:', err);
    req.flash('error_msg', 'Failed to load performance data');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Get improvement analysis
 */
exports.getImprovement = async (req, res) => {
  try {
    const { certificationId } = req.params;
    
    // Validate certification
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      req.flash('error_msg', 'Certification not found');
      return res.redirect('/analytics/dashboard');
    }
    
    // Get improvement data
    const improvementData = await analyticsService.getImprovementAnalysis(
      req.user._id,
      certificationId
    );
    
    // Get weak areas
    const weakAreas = await analyticsService.getUserWeakAreas(
      req.user._id,
      certificationId
    );
    
    // Get study recommendations
    const studyRecommendations = await aiService.getStudyRecommendations(
      req.user._id,
      certificationId,
      weakAreas
    );
    
    // Get estimated readiness
    const readiness = await analyticsService.getEstimatedReadiness(
      req.user._id,
      certificationId
    );
    
    res.render('analytics/improvement', {
      title: `${certification.name} Improvement Analysis`,
      certification,
      improvementData,
      weakAreas,
      studyRecommendations,
      readiness
    });
  } catch (err) {
    console.error('Error loading improvement analysis:', err);
    req.flash('error_msg', 'Failed to load improvement analysis');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Get user comparison
 */
exports.getComparison = async (req, res) => {
  try {
    const { certificationId } = req.params;
    
    // Validate certification
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      req.flash('error_msg', 'Certification not found');
      return res.redirect('/analytics/dashboard');
    }
    
    // Get peer comparison data
    const comparisonData = await analyticsService.getPeerComparison(
      req.user._id,
      certificationId
    );
    
    res.render('analytics/comparison', {
      title: `${certification.name} Peer Comparison`,
      certification,
      comparisonData
    });
  } catch (err) {
    console.error('Error loading comparison data:', err);
    req.flash('error_msg', 'Failed to load comparison data');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Get user time analysis
 */
exports.getTimeAnalysis = async (req, res) => {
  try {
    const { certificationId } = req.params;
    
    // Validate certification if provided
    let certification = null;
    if (certificationId) {
      certification = await Certification.findById(certificationId);
      if (!certification) {
        req.flash('error_msg', 'Certification not found');
        return res.redirect('/analytics/dashboard');
      }
    }
    
    // Get time analysis data
    const timeAnalysis = await analyticsService.getUserTimeAnalysis(
      req.user._id,
      certificationId
    );
    
    // Get all certifications for filter
    const certifications = await Certification.find({ active: true })
      .select('name code');
    
    res.render('analytics/time-analysis', {
      title: 'Time Management Analysis',
      certification,
      timeAnalysis,
      certifications,
      selectedCertification: certificationId
    });
  } catch (err) {
    console.error('Error loading time analysis:', err);
    req.flash('error_msg', 'Failed to load time analysis');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Get learning curve
 */
exports.getLearningCurve = async (req, res) => {
  try {
    // Get all user's certification progress with at least 3 attempts
    const userProgress = await User.findById(req.user._id)
      .select('certificationProgress');
    
    // Filter certifications with enough attempts
    const eligibleCertifications = userProgress.certificationProgress.filter(
      progress => progress.attemptsCount >= 3
    );
    
    if (eligibleCertifications.length === 0) {
      req.flash('info_msg', 'You need at least 3 attempts on a certification to view learning curve');
      return res.redirect('/analytics/dashboard');
    }
    
    // Get certification details
    const certificationIds = eligibleCertifications.map(p => p.certificationId);
    const certifications = await Certification.find({
      _id: { $in: certificationIds }
    }).select('name code');
    
    // Get learning curve data for each certification
    const learningCurves = await Promise.all(
      certificationIds.map(certId => 
        analyticsService.getUserLearningCurve(req.user._id, certId)
      )
    );
    
    // Map certification data to learning curves
    const learningCurveData = certifications.map((cert, index) => ({
      certification: cert,
      data: learningCurves[index]
    }));
    
    res.render('analytics/learning-curve', {
      title: 'Learning Curve Analysis',
      learningCurveData
    });
  } catch (err) {
    console.error('Error loading learning curve:', err);
    req.flash('error_msg', 'Failed to load learning curve analysis');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Export analytics data
 */
exports.exportAnalytics = async (req, res) => {
  try {
    const { format } = req.query;
    
    // Get user's complete analytics data
    const analyticsData = await analyticsService.getUserCompleteAnalytics(req.user._id);
    
    if (format === 'csv') {
      // Format data for CSV
      const csvData = formatAnalyticsForCSV(analyticsData);
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=my_analytics.csv');
      
      return res.send(csvData);
    } else {
      // Default to JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=my_analytics.json');
      
      return res.json(analyticsData);
    }
  } catch (err) {
    console.error('Error exporting analytics:', err);
    req.flash('error_msg', 'Failed to export analytics data');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Format analytics data for CSV export
 * @param {Object} analyticsData - User analytics data
 * @returns {string} CSV formatted data
 */
function formatAnalyticsForCSV(analyticsData) {
  // Implementation would depend on the structure of analyticsData
  // This is a simplified example
  
  // Generate attempts CSV
  let csvData = 'Attempt ID,Certification,Exam,Date,Score,Result,Time Spent (min)\n';
  
  analyticsData.attempts.forEach(attempt => {
    csvData += `${attempt.id},${attempt.certification},${attempt.exam},${attempt.date},${attempt.score}%,${attempt.passed ? 'PASS' : 'FAIL'},${Math.round(attempt.timeSpent / 60)}\n`;
  });
  
  // Add domain performance
  csvData += '\nDomain Performance\nCertification,Domain,Attempts,Average Score\n';
  
  analyticsData.domainPerformance.forEach(domain => {
    csvData += `${domain.certification},${domain.domain},${domain.attempts},${domain.averageScore}%\n`;
  });
  
  return csvData;
}

/**
 * Get specific attempt analysis
 */
exports.getAttemptAnalysis = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Get attempt details
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id,
      completed: true
    });
    
    if (!attempt) {
      req.flash('error_msg', 'Attempt not found');
      return res.redirect('/analytics/dashboard');
    }
    
    // Get certification and exam details
    const certification = await Certification.findById(attempt.certificationId);
    
    // Get detailed analysis of this attempt
    const analysis = await analyticsService.getAttemptAnalysis(attemptId);
    
    res.render('analytics/attempt-analysis', {
      title: 'Attempt Analysis',
      attempt,
      certification,
      analysis
    });
  } catch (err) {
    console.error('Error loading attempt analysis:', err);
    req.flash('error_msg', 'Failed to load attempt analysis');
    res.redirect('/analytics/dashboard');
  }
};

/**
 * Get API analytics data
 */
exports.getApiAnalytics = async (req, res) => {
  try {
    const { certificationId, range } = req.query;
    
    // Determine date range
    let startDate;
    switch (range) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }
    
    // Get analytics data based on parameters
    let analyticsData;
    
    if (certificationId) {
      analyticsData = await analyticsService.getUserPerformanceData(
        req.user._id,
        certificationId,
        startDate
      );
    } else {
      analyticsData = await analyticsService.getUserAttemptsSummary(
        req.user._id,
        startDate
      );
    }
    
    return res.json({
      success: true,
      data: analyticsData
    });
  } catch (err) {
    console.error('Error getting API analytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get analytics data'
    });
  }
};