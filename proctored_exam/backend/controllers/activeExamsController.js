// controllers/activeExamsController.js
const Attempt = require('../models/attempt');
const User = require('../models/user');
const Exam = require('../models/exam');
const Certification = require('../models/certification');
const FlaggedActivity = require('../models/flaggedActivity');
const ActivityLog = require('../models/activityLog');

/**
 * Get active exams data
 */
exports.getActiveExams = async (req, res) => {
  try {
    // Get active exam sessions
    const activeSessions = await getActiveSessions();
    
    // Get flagged activities
    const flaggedActivities = await getRecentFlaggedActivities();
    
    // Calculate stats
    const stats = {
      activeTakers: activeSessions.length,
      activeExams: await getUniqueActiveExamsCount(),
      flaggedSessions: await getFlaggedSessionsCount()
    };
    
    res.status(200).json({
      success: true,
      data: {
        sessions: activeSessions,
        flaggedActivities,
        stats
      }
    });
  } catch (error) {
    console.error('Error getting active exams data:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get active exams data',
      data: null
    });
  }
}


/**
 * Get session activity logs
 */
exports.getSessionActivityLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find logs for the given session
    const logs = await ActivityLog.find({
      attemptId: sessionId
    })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();
    
    // Format logs for the frontend
    const formattedLogs = logs.map(log => ({
      timestamp: log.timestamp,
      message: log.message,
      isWarning: log.type === 'warning' || log.type === 'violation'
    }));
    
    res.status(200).json(formattedLogs);
  } catch (err) {
    console.error('Error getting session activity logs:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get session activity logs',
      error: err.message
    });
  }
};

/**
 * Terminate exam session
 */
exports.terminateExamSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find the attempt
    const attempt = await Attempt.findById(sessionId);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam session not found'
      });
    }
    
    if (attempt.completed) {
      return res.status(400).json({
        success: false,
        message: 'This exam session is already completed'
      });
    }
    
    // Update the attempt to mark it as completed and terminated
    attempt.completed = true;
    attempt.inProgress = false;
    attempt.endTime = new Date();
    attempt.status = 'terminated';
    attempt.terminatedBy = req.user._id; // Assuming admin user is in the request
    
    // Calculate scores if there are any responses
    if (attempt.responses && attempt.responses.length > 0) {
      const totalQuestions = attempt.questions ? attempt.questions.length : 0;
      const answeredQuestions = attempt.responses.length;
      const correctAnswers = attempt.responses.filter(r => r.isCorrect).length;
      
      // Basic score calculation
      const score = (correctAnswers / totalQuestions) * 100;
      
      attempt.score = {
        overall: score,
        byDomain: [] // Could calculate domain-specific scores here
      };
      
      attempt.passed = score >= (attempt.passingScore || 70); // Default passing score is 70%
    } else {
      // No responses, set score to 0
      attempt.score = {
        overall: 0,
        byDomain: []
      };
      attempt.passed = false;
    }
    
    await attempt.save();
    
    // Log the termination
    await ActivityLog.create({
      attemptId: sessionId,
      userId: attempt.userId,
      examId: attempt.examId,
      type: 'admin_action',
      message: `Exam was terminated by administrator (${req.user.username || 'Admin'})`,
      timestamp: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Exam session has been terminated successfully'
    });
  } catch (err) {
    console.error('Error terminating exam session:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate exam session',
      error: err.message
    });
  }
};

/**
 * Flag exam session
 */
exports.flagSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason, severity } = req.body;
    
    // Validate input
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }
    
    // Check if session exists
    const attempt = await Attempt.findById(sessionId);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam session not found'
      });
    }
    
    // Create flagged activity
    const flaggedActivity = await FlaggedActivity.create({
      attemptId: sessionId,
      userId: attempt.userId,
      examId: attempt.examId,
      certificationId: attempt.certificationId,
      reason,
      severity: severity || 'Medium',
      createdBy: req.user._id, // Assuming admin user is in the request
      createdAt: new Date()
    });
    
    // Update attempt to mark as flagged
    attempt.flagged = true;
    await attempt.save();
    
    // Log the flagging action
    await ActivityLog.create({
      attemptId: sessionId,
      userId: attempt.userId,
      examId: attempt.examId,
      type: 'flag',
      message: `Exam was flagged by administrator: ${reason}`,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Session has been flagged successfully',
      flaggedActivity
    });
  } catch (err) {
    console.error('Error flagging session:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to flag session',
      error: err.message
    });
  }
};

/**
 * Send warning to user
 */
exports.sendWarningToUser = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    // Validate input
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Warning message is required'
      });
    }
    
    // Check if session exists
    const attempt = await Attempt.findById(sessionId);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam session not found'
      });
    }
    
    // Create a warning message activity log
    await ActivityLog.create({
      attemptId: sessionId,
      userId: attempt.userId,
      examId: attempt.examId,
      type: 'warning',
      message: `Warning from proctor: ${message}`,
      timestamp: new Date()
    });
    
    // In a real implementation, you would send the warning to the user in real-time
    // This could be done via WebSockets or similar technology
    
    res.status(200).json({
      success: true,
      message: 'Warning has been sent to the user'
    });
  } catch (err) {
    console.error('Error sending warning to user:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to send warning',
      error: err.message
    });
  }
};

/**
 * Dismiss flagged activity
 */
exports.dismissFlaggedActivity = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    // Find the flagged activity
    const flaggedActivity = await FlaggedActivity.findById(activityId);
    
    if (!flaggedActivity) {
      return res.status(404).json({
        success: false,
        message: 'Flagged activity not found'
      });
    }
    
    // Mark as resolved
    flaggedActivity.resolved = true;
    flaggedActivity.resolvedBy = req.user._id; // Assuming admin user is in the request
    flaggedActivity.resolvedAt = new Date();
    flaggedActivity.resolution = 'Dismissed by administrator';
    
    await flaggedActivity.save();
    
    // Check if this is the only flag for the attempt
    const otherFlags = await FlaggedActivity.countDocuments({
      attemptId: flaggedActivity.attemptId,
      _id: { $ne: activityId },
      resolved: false
    });
    
    // If no other flags, update the attempt
    if (otherFlags === 0) {
      await Attempt.findByIdAndUpdate(
        flaggedActivity.attemptId,
        { $set: { flagged: false } }
      );
    }
    
    // Log the dismissal
    await ActivityLog.create({
      attemptId: flaggedActivity.attemptId,
      userId: flaggedActivity.userId,
      examId: flaggedActivity.examId,
      type: 'admin_action',
      message: `Flag dismissed by administrator (${req.user.username || 'Admin'})`,
      timestamp: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Flagged activity has been dismissed successfully'
    });
  } catch (err) {
    console.error('Error dismissing flagged activity:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss flagged activity',
      error: err.message
    });
  }
};

/**
 * Get active exam sessions
 * @returns {Promise<Array>} Active exam sessions
 */
async function getActiveSessions() {
  try {
    // Find active exam attempts
    const activeAttempts = await Attempt.find({
      completed: false,
      inProgress: true,
      startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .sort({ startTime: -1 })
    .lean();
    
    if (activeAttempts.length === 0) {
      return [];
    }
    
    // Get user, exam, and certification details
    const userIds = [...new Set(activeAttempts.map(a => a.userId.toString()))];
    const examIds = [...new Set(activeAttempts.map(a => a.examId.toString()))];
    const certIds = [...new Set(activeAttempts.map(a => a.certificationId.toString()))];
    
    const [users, exams, certifications, flaggedAttempts] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('username email photo lastActive').lean(),
      Exam.find({ _id: { $in: examIds } }).select('name timeLimit').lean(),
      Certification.find({ _id: { $in: certIds } }).select('name').lean(),
      FlaggedActivity.find({ attemptId: { $in: activeAttempts.map(a => a._id) }, resolved: false })
        .select('attemptId')
        .lean()
    ]);
    
    // Create maps for faster lookups
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });
    
    const examMap = {};
    exams.forEach(e => {
      examMap[e._id.toString()] = e;
    });
    
    const certMap = {};
    certifications.forEach(c => {
      certMap[c._id.toString()] = c;
    });
    
    // Create set of flagged attempt IDs
    const flaggedAttemptIds = new Set(
      flaggedAttempts.map(f => f.attemptId.toString())
    );
    
    // Format the active sessions
    return activeAttempts.map(attempt => {
      const userId = attempt.userId.toString();
      const examId = attempt.examId.toString();
      const certId = attempt.certificationId.toString();
      
      const user = userMap[userId] || {};
      const exam = examMap[examId] || {};
      const cert = certMap[certId] || {};
      
      // Calculate elapsed time
      const elapsedTime = Date.now() - new Date(attempt.startTime).getTime();
      
      // Calculate total time in milliseconds
      const totalTime = exam.timeLimit ? exam.timeLimit * 60 * 1000 : 3600000; // Default 1 hour
      
      // Calculate progress
      const totalQuestions = attempt.questions ? attempt.questions.length : 0;
      const completedQuestions = attempt.responses ? attempt.responses.length : 0;
      const progressPercentage = totalQuestions > 0 ? 
        (completedQuestions / totalQuestions) * 100 : 0;
      
      return {
        _id: attempt._id.toString(),
        username: user.username || 'Unknown User',
        email: user.email || '',
        userPhoto: user.photo || null,
        isOnline: user.lastActive ? 
          (Date.now() - new Date(user.lastActive).getTime() < 5 * 60 * 1000) : false, // Online if active in last 5 min
        examName: exam.name || 'Unknown Exam',
        certificationName: cert.name || 'Unknown Certification',
        startTime: attempt.startTime,
        elapsedTime,
        totalTime,
        completedQuestions,
        totalQuestions,
        progressPercentage,
        isFlagged: flaggedAttemptIds.has(attempt._id.toString())
      };
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    throw error;
  }
}

/**
 * Get unique active exams count
 * @returns {Promise<number>} Count of unique active exams
 */
async function getUniqueActiveExamsCount() {
  try {
    const result = await Attempt.aggregate([
      {
        $match: {
          completed: false,
          inProgress: true,
          startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$examId',
          count: { $sum: 1 }
        }
      },
      {
        $count: 'uniqueExams'
      }
    ]);
    
    return result.length > 0 ? result[0].uniqueExams : 0;
  } catch (error) {
    console.error('Error getting unique active exams count:', error);
    throw error;
  }
}

/**
 * Get flagged sessions count
 * @returns {Promise<number>} Count of flagged sessions
 */
async function getFlaggedSessionsCount() {
  try {
    return await FlaggedActivity.countDocuments({
      resolved: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
  } catch (error) {
    console.error('Error getting flagged sessions count:', error);
    throw error;
  }
}

/**
 * Get recent flagged activities
 * @returns {Promise<Array>} Recent flagged activities
 */
async function getRecentFlaggedActivities() {
  try {
    const flaggedActivities = await FlaggedActivity.find({
      resolved: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('attemptId', 'userId examId')
    .lean();
    
    if (flaggedActivities.length === 0) {
      return [];
    }
    
    // Get user and exam details
    const attemptIds = flaggedActivities.map(f => f.attemptId?._id).filter(id => id);
    const userIds = flaggedActivities.map(f => f.attemptId?.userId).filter(id => id);
    const examIds = flaggedActivities.map(f => f.attemptId?.examId).filter(id => id);
    
    const [users, exams] = await Promise.all([
      User.find({ _id: { $in: userIds } }).select('username').lean(),
      Exam.find({ _id: { $in: examIds } }).select('name').lean()
    ]);
    
    // Create maps for faster lookups
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });
    
    const examMap = {};
    exams.forEach(e => {
      examMap[e._id.toString()] = e;
    });
    
    // Format flagged activities
    return flaggedActivities.map(activity => {
      const attempt = activity.attemptId || {};
      const userId = attempt.userId?.toString();
      const examId = attempt.examId?.toString();
      
      const user = userId ? userMap[userId] || {} : {};
      const exam = examId ? examMap[examId] || {} : {};
      
      return {
        _id: activity._id.toString(),
        username: user.username || 'Unknown User',
        examName: exam.name || 'Unknown Exam',
        timestamp: activity.createdAt,
        reason: activity.reason || 'Unspecified reason',
        severity: activity.severity || 'Medium',
        details: activity.details || ''
      };
    });

} catch (error) {
    console.error('Error getRecentFlaggedActivities:', error);
    throw error;
  }
}
