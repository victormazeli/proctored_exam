// controllers/proctorController.js
const Attempt = require('../models/attempt');
const proctorService = require('../services/proctorService');
const User = require('../models/user');

/**
 * Initialize proctoring for an exam
 * This controller handles setup for proctoring on the server side
 */
exports.initializeProctoring = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Verify user owns this attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found or unauthorized'
      });
    }
    
    // Get user's proctor settings
    const user = await User.findById(req.user._id);
    const proctorEnabled = user.settings?.proctorEnabled !== false;
    
    if (!proctorEnabled) {
      return res.json({
        success: true,
        proctorEnabled: false,
        message: 'Proctoring is disabled in user settings'
      });
    }
    
    // Initialize webcam monitoring configuration
    const monitoringConfig = proctorService.initializeWebcamMonitoring({
      faceDetectionEnabled: true,
      attentionTrackingEnabled: true,
      snapshotsEnabled: false, // For privacy, we're not enabling snapshots
      captureInterval: 5000, // 5 seconds between checks
    });
    
    // Initialize keyboard restrictions
    const keyboardConfig = proctorService.simulateKeyboardLockdown({
      blockCombinations: true,
      blockFunctionKeys: true,
      blockClipboard: true
    });
    
    return res.json({
      success: true,
      proctorEnabled: true,
      config: {
        webcam: monitoringConfig,
        keyboard: keyboardConfig,
        fullScreenRequired: true,
        tabSwitchingDetection: true,
        violationThreshold: 5, // Number of violations before warning
        heartbeatInterval: 30000 // 30 seconds
      }
    });
  } catch (err) {
    console.error('Error initializing proctoring:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize proctoring'
    });
  }
};

/**
 * Log proctor violation
 * Called from client-side to report violations
 */
exports.logViolation = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Violation type is required'
      });
    }
    
    // Log violation using service
    const logged = await proctorService.logViolation(
      req.user._id,
      {
        attemptId,
        type,
        details: details || {}
      }
    );
    
    if (!logged) {
      return res.status(404).json({
        success: false,
        message: 'Failed to log violation. Attempt may be completed or unauthorized.'
      });
    }
    
    return res.json({
      success: true
    });
  } catch (err) {
    console.error('Error logging violation:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to log violation'
    });
  }
};

/**
 * Get proctor status
 * Used by admin to monitor ongoing exams
 */
exports.getProctorStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }
    
    const { attemptId } = req.params;
    
    const status = await proctorService.getProctorStatus(attemptId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }
    
    return res.json({
      success: true,
      status
    });
  } catch (err) {
    console.error('Error getting proctor status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get proctor status'
    });
  }
};

/**
 * Get active proctored exams
 * Used by admin to monitor all ongoing exams
 */
exports.getActiveExams = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      req.flash('error_msg', 'Unauthorized. Admin access required.');
      return res.redirect('/admin');
    }
    
    // Get all active (incomplete) attempts
    const activeAttempts = await Attempt.find({
      completed: false
    })
    .populate('userId', 'username email profile.name')
    .populate('examId', 'name')
    .populate('certificationId', 'name')
    .sort({ startTime: -1 });
    
    // Get proctor status for each attempt
    const proctorData = await Promise.all(
      activeAttempts.map(async (attempt) => {
        const status = await proctorService.getProctorStatus(attempt._id);
        return {
          attempt,
          status
        };
      })
    );
    
    res.render('admin/active-exams', {
      title: 'Active Proctored Exams',
      proctorData
    });
  } catch (err) {
    console.error('Error getting active exams:', err);
    req.flash('error_msg', 'Failed to load active exams');
    res.redirect('/admin');
  }
};

/**
 * Update user proctor settings
 */
exports.updateProctorSettings = async (req, res) => {
  try {
    const { proctorEnabled, webcamPreference, keyboardRestrictions } = req.body;
    
    const result = await proctorService.configureProctorSettings(
      req.user._id,
      {
        proctorEnabled: proctorEnabled === 'true',
        webcamPreference,
        keyboardRestrictions: keyboardRestrictions === 'true'
      }
    );
    
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update proctor settings'
      });
    }
    
    return res.json({
      success: true,
      message: 'Proctor settings updated successfully'
    });
  } catch (err) {
    console.error('Error updating proctor settings:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update proctor settings'
    });
  }
};

/**
 * Analyze proctor events
 * Used to detect suspicious patterns in completed exams
 */
exports.analyzeProctorEvents = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }
    
    const { attemptId } = req.params;
    
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }
    
    const events = attempt.proctorEvents || [];
    const analysis = proctorService.analyzeProctorEvents(events);
    
    return res.json({
      success: true,
      attemptId,
      eventCount: events.length,
      analysis
    });
  } catch (err) {
    console.error('Error analyzing proctor events:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze proctor events'
    });
  }
};

/**
 * Send proctor message
 * Used by admin to send messages to users during exams
 */
exports.sendProctorMessage = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }
    
    const { attemptId } = req.params;
    const { message, type } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    // Validate type
    if (!['warning', 'info', 'terminate'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message type'
      });
    }
    
    // Verify attempt exists and is active
    const attempt = await Attempt.findOne({
      _id: attemptId,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }
    
    // In a real application, this would emit a socket event to the client
    // For now, we'll just log it and pretend it was sent
    console.log(`Proctor message to ${attemptId}: [${type}] ${message}`);
    
    // Record the message in the attempt history
    await Attempt.findByIdAndUpdate(attemptId, {
      $push: {
        proctorEvents: {
          time: new Date(),
          type: 'admin_message',
          details: {
            message,
            messageType: type,
            sentBy: req.user._id
          }
        }
      }
    });
    
    return res.json({
      success: true,
      message: 'Proctor message sent successfully'
    });
  } catch (err) {
    console.error('Error sending proctor message:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send proctor message'
    });
  }
};

/**
 * Terminate exam
 * Used by admin to forcibly end an exam
 */
exports.terminateExam = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required.'
      });
    }
    
    const { attemptId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Termination reason is required'
      });
    }
    
    // Find the attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Active attempt not found'
      });
    }
    
    // Mark attempt as completed with termination reason
    attempt.completed = true;
    attempt.endTime = new Date();
    attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
    attempt.terminatedBy = req.user._id;
    attempt.terminationReason = reason;
    
    // Add termination event
    attempt.proctorEvents.push({
      time: new Date(),
      type: 'admin_termination',
      details: {
        reason,
        adminId: req.user._id
      }
    });
    
    // Calculate partial score if any questions were answered
    if (attempt.questions.some(q => q.userAnswers && q.userAnswers.length > 0)) {
      const answeredQuestions = attempt.questions.filter(
        q => q.userAnswers && q.userAnswers.length > 0
      );
      
      // Simple scoring for terminated exams
      const score = {
        overall: 0,
        byDomain: []
      };
      
      attempt.score = score;
      attempt.passed = false;
    } else {
      // No questions answered
      attempt.score = {
        overall: 0,
        byDomain: []
      };
      attempt.passed = false;
    }
    
    await attempt.save();
    
    // In a real application, emit socket event to notify client
    
    return res.json({
      success: true,
      message: 'Exam terminated successfully'
    });
  } catch (err) {
    console.error('Error terminating exam:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to terminate exam'
    });
  }
};

/**
 * Get proctor violation summary
 * Used for reviewing attempt security after completion
 */
exports.getViolationSummary = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // Verify user is admin or attempt owner
    const attempt = await Attempt.findById(attemptId);
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found'
      });
    }
    
    // Check authorization
    if (req.user.role !== 'admin' && 
        attempt.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Analyze proctor events
    const events = attempt.proctorEvents || [];
    const analysis = proctorService.analyzeProctorEvents(events);
    
    // Count violations by type
    const violationCounts = events.reduce((counts, event) => {
      if (['face_not_visible', 'multiple_faces', 'tab_switch', 
           'fullscreen_exit', 'keyboard_restriction'].includes(event.type)) {
        counts[event.type] = (counts[event.type] || 0) + 1;
      }
      return counts;
    }, {});
    
    return res.json({
      success: true,
      attemptId,
      totalViolations: events.length,
      violationCounts,
      analysis,
      suspiciousActivity: analysis.suspiciousActivity,
      riskLevel: analysis.risk
    });
  } catch (err) {
    console.error('Error getting violation summary:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get violation summary'
    });
  }
};