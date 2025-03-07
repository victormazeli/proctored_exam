// services/proctorService.js
const Attempt = require('../models/attempt');
const User = require('../models/user');

/**
 * Log a proctoring violation
 * @param {string} userId - User ID
 * @param {Object} violationData - Violation data
 */
exports.logViolation = async (userId, violationData) => {
  try {
    const { attemptId, type, details } = violationData;
    
    if (!attemptId || !type) {
      console.error('Invalid violation data', violationData);
      return false;
    }
    
    // Verify user owns this attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId,
      completed: false
    });
    
    if (!attempt) {
      console.error('Attempt not found or unauthorized', { attemptId, userId });
      return false;
    }
    
    // Add violation to attempt
    const violationEvent = {
      time: new Date(),
      type,
      details: details || {}
    };
    
    await Attempt.findByIdAndUpdate(attemptId, {
      $push: { proctorEvents: violationEvent }
    });
    
    return true;
  } catch (err) {
    console.error('Error logging violation:', err);
    return false;
  }
};

/**
 * Get real-time proctor status
 * @param {string} attemptId - Attempt ID
 */
exports.getProctorStatus = async (attemptId) => {
  try {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return null;
    }
    
    const recentEvents = attempt.proctorEvents.filter(
      event => new Date() - new Date(event.time) < 15 * 60 * 1000 // last 15 minutes
    );
    
    // Count violations by type
    const violationCounts = recentEvents.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});
    
    // Calculate overall severity level
    let severityLevel = 'normal';
    const totalViolations = recentEvents.length;
    
    if (totalViolations > 10) {
      severityLevel = 'critical';
    } else if (totalViolations > 5) {
      severityLevel = 'warning';
    } else if (totalViolations > 2) {
      severityLevel = 'caution';
    }
    
    return {
      attemptId,
      status: attempt.completed ? 'completed' : 'in_progress',
      violationCounts,
      totalViolations,
      severityLevel,
      lastViolation: recentEvents.length > 0 ? recentEvents[recentEvents.length - 1] : null
    };
  } catch (err) {
    console.error('Error getting proctor status:', err);
    return null;
  }
};

/**
 * Configure exam proctoring settings
 * @param {string} userId - User ID
 * @param {Object} settings - Proctor settings
 */
exports.configureProctorSettings = async (userId, settings) => {
  try {
    const { proctorEnabled, webcamPreference, keyboardRestrictions } = settings;
    
    await User.findByIdAndUpdate(userId, {
      'settings.proctorEnabled': proctorEnabled,
      'settings.webcamPreference': webcamPreference,
      'settings.keyboardRestrictions': keyboardRestrictions
    });
    
    return true;
  } catch (err) {
    console.error('Error configuring proctor settings:', err);
    return false;
  }
};

/**
 * Initialize webcam monitoring
 * @param {Object} options - Monitoring options
 * @returns {Object} - Monitoring configuration
 */
exports.initializeWebcamMonitoring = (options = {}) => {
  const config = {
    captureInterval: options.captureInterval || 5000, // Milliseconds between captures
    faceDetectionEnabled: options.faceDetectionEnabled !== false,
    attentionTrackingEnabled: options.attentionTrackingEnabled || false,
    snapshotsEnabled: options.snapshotsEnabled || false,
    violationThresholds: {
      faceNotVisible: options.faceNotVisibleThreshold || 3,
      multiplesFaces: options.multipleFacesThreshold || 1,
      attentionLoss: options.attentionLossThreshold || 5
    },
    tensorFlowModelUrl: '/models/face-detection-model'
  };
  
  return config;
};

/**
 * Process a webcam frame for violations
 * @param {Object} frameData - Frame analysis data
 * @returns {Array} - Detected violations
 */
exports.processWebcamFrame = (frameData) => {
  const violations = [];
  
  // Check face detection results
  if (frameData.faceDetection) {
    if (frameData.faceDetection.facesDetected === 0) {
      violations.push({
        type: 'face_not_visible',
        severity: 'medium',
        details: {
          confidence: frameData.faceDetection.confidence,
          timestamp: frameData.timestamp
        }
      });
    } else if (frameData.faceDetection.facesDetected > 1) {
      violations.push({
        type: 'multiple_faces',
        severity: 'high',
        details: {
          faceCount: frameData.faceDetection.facesDetected,
          confidence: frameData.faceDetection.confidence,
          timestamp: frameData.timestamp
        }
      });
    }
  }
  
  // Check attention tracking
  if (frameData.attentionTracking && !frameData.attentionTracking.isAttentive) {
    violations.push({
      type: 'attention_loss',
      severity: 'low',
      details: {
        gazeDirection: frameData.attentionTracking.gazeDirection,
        confidence: frameData.attentionTracking.confidence,
        timestamp: frameData.timestamp
      }
    });
  }
  
  return violations;
};

/**
 * Simulate keyboard lockdown
 * @param {Object} options - Lockdown options
 * @returns {Object} - Keyboard restriction configuration
 */
exports.simulateKeyboardLockdown = (options = {}) => {
  return {
    enabled: true,
    allowedKeys: options.allowedKeys || [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', // Navigation
      'Tab', 'Enter', 'Space', // Standard interaction
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', // Numbers
      'a', 'b', 'c', 'd'  // Multiple choice options
    ],
    blockCombinations: options.blockCombinations !== false,
    blockFunctionKeys: options.blockFunctionKeys !== false,
    blockClipboard: options.blockClipboard !== false,
    onViolation: 'log' // 'log', 'warn', or 'block'
  };
};

/**
 * Analyze proctor events for suspicious patterns
 * @param {Array} events - Proctor events
 * @returns {Object} - Analysis results
 */
exports.analyzeProctorEvents = (events) => {
  if (!events || events.length === 0) {
    return {
      suspiciousActivity: false,
      risk: 'low',
      patterns: []
    };
  }
  
  // Group events by type
  const eventsByType = events.reduce((acc, event) => {
    acc[event.type] = acc[event.type] || [];
    acc[event.type].push(event);
    return acc;
  }, {});
  
  const patterns = [];
  let overallRisk = 'low';
  
  // Check for clusters of face not visible events
  if (eventsByType.face_not_visible && eventsByType.face_not_visible.length > 3) {
    const clusters = findTimeClusters(eventsByType.face_not_visible);
    if (clusters.length > 0) {
      patterns.push({
        type: 'repeated_face_absence',
        risk: clusters.length > 2 ? 'high' : 'medium',
        details: {
          clusters: clusters.length,
          totalEvents: eventsByType.face_not_visible.length
        }
      });
      
      if (clusters.length > 2) overallRisk = 'high';
      else if (overallRisk !== 'high') overallRisk = 'medium';
    }
  }
  
  // Check for tab switching patterns
  if (eventsByType.tab_switch && eventsByType.tab_switch.length > 2) {
    patterns.push({
      type: 'repeated_tab_switching',
      risk: eventsByType.tab_switch.length > 5 ? 'high' : 'medium',
      details: {
        count: eventsByType.tab_switch.length,
        timeSpan: getTimeSpanMinutes(eventsByType.tab_switch)
      }
    });
    
    if (eventsByType.tab_switch.length > 5) overallRisk = 'high';
    else if (overallRisk !== 'high') overallRisk = 'medium';
  }
  
  return {
    suspiciousActivity: patterns.length > 0,
    risk: overallRisk,
    patterns
  };
};

// Helper function to find clusters of events in time
function findTimeClusters(events, maxGapSeconds = 30) {
  if (!events || events.length < 2) return [];
  
  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.time) - new Date(b.time)
  );
  
  const clusters = [];
  let currentCluster = [sortedEvents[0]];
  
  for (let i = 1; i < sortedEvents.length; i++) {
    const gap = (new Date(sortedEvents[i].time) - new Date(sortedEvents[i-1].time)) / 1000;
    
    if (gap <= maxGapSeconds) {
      currentCluster.push(sortedEvents[i]);
    } else {
      if (currentCluster.length > 1) {
        clusters.push([...currentCluster]);
      }
      currentCluster = [sortedEvents[i]];
    }
  }
  
  if (currentCluster.length > 1) {
    clusters.push(currentCluster);
  }
  
  return clusters;
}

// Helper function to get time span in minutes
function getTimeSpanMinutes(events) {
  if (!events || events.length < 2) return 0;
  
  const times = events.map(e => new Date(e.time).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return Math.round((maxTime - minTime) / (1000 * 60));
}