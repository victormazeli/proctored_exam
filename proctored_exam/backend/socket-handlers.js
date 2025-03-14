const jwt = require('jsonwebtoken');
const User = require('./models/user');
/**
 * Setup Socket.io handlers for proctoring system
 * @param {Object} io - Socket.io instance
 * @param {Object} sessionMiddleware - Express session middleware
 * @param {Object} config - Configuration options
 */
function setupSocketHandlers(io, sessionMiddleware, config = {}) {
    const {
      autoDisconnectMinutes = 15,
      cleanupIntervalMinutes = 5
    } = config;
  
    // Import services
    const proctorService = require('./services/proctorService');
    const examService = require('./services/examService');
  
    // Create namespaces for different purposes
    const proctorNamespace = io.of('/proctor'); // For exam-takers being proctored
    const monitorNamespace = io.of('/proctor-monitor'); // For proctors/admins monitoring exams
  
    // Apply authentication to namespaces
    proctorNamespace.use(async (socket, next) => {
      try {
        // Get token from socket handshake auth or query params
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kjhruht588u659u6957u9u');
        
        // Fetch user from database
        const user = await User.findById(decoded.id);
        
        if (!user || !user.active) {
          return next(new Error('User not found or inactive'));
        }
        
        // Attach user info to socket
        socket.userId = user._id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  
  
    // Apply stricter authentication for monitors (proctors/admins)
    monitorNamespace.use(async (socket, next) => {
      try {
        // Get token from socket handshake
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch user from database
        const user = await User.findById(decoded.id);
        
        // Check for proper role
        if (!user || !['admin', 'proctor', 'instructor'].includes(user.role)) {
          return next(new Error('Insufficient permissions'));
        }
        
        // Attach user info to socket
        socket.userId = user._id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        console.error('Monitor authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  
    // Handle proctor connections (exam-takers)
    proctorNamespace.on('connection', (socket) => {
      console.log('Proctor client connected:', socket.id, 'User:', socket.userId);
      
      // Join exam attempt room when exam starts
      socket.on('join_exam', async (data) => {
        try {
          const { attemptId  } = data;
          
          // Validate the attempt belongs to this user
          const Attempt = require('./models/attempt');
          const attempt = await Attempt.findOne({
            _id: attemptId,
            userId: socket.userId,
            completed: false
          });
          
          if (!attempt) {
            socket.emit('error', { message: 'Invalid exam attempt' });
            return;
          }
          
          // Join room for this specific attempt
          socket.join(`attempt-${attemptId}`);
          
          // Store exam data on socket for easier access
          socket.examData = {
            attemptId,
            startTime: attempt.startTime
          };
          
          // Log connection
          const connectionSuccess = await proctorService.logViolation(socket.userId, {
            attemptId,
            type: 'proctor_connected',
            details: {
              socketId: socket.id,
              timestamp: new Date()
            }
          });
          
          socket.emit('joined_exam', { success: true });
          
        } catch (error) {
          console.error('Error joining exam:', error);
          socket.emit('error', { message: 'Failed to join exam' });
        }
      });
      
      // Handle proctoring violations and events
      socket.on('proctor:violation', async (data) => {
        try {
          // Ensure user is in an exam or data contains attemptId
          const attemptId = socket.examData?.attemptId || data.attemptId;
          
          if (!attemptId) {
            socket.emit('error', { message: 'No active exam or missing attemptId' });
            return;
          }
          
          // Log the violation using existing proctorService function
          const success = await proctorService.logViolation(
            socket.userId,
            {
              attemptId,
              type: data.type,
              details: data.details || {}
            }
          );
          
          if (!success) {
            socket.emit('error', { message: 'Failed to log violation' });
            return;
          }
          
          // Update last activity timestamp
          socket.lastActivity = new Date();
          
          // Notify monitors about significant violations
          if (['face_not_visible', 'tab_switch', 'window_blur', 'multiple_faces'].includes(data.type)) {
            monitorNamespace.to(`monitor-${attemptId}`).emit('violation', {
              attemptId,
              userId: socket.userId,
              type: data.type,
              details: data.details,
              timestamp: new Date()
            });
          }
          
          // Acknowledge successful logging
          socket.emit('violation_logged', { success: true });
          
        } catch (error) {
          console.error('Error processing violation:', error);
          socket.emit('error', { message: 'Failed to process violation' });
        }
      });
      
      // Handle batch violations (for reconnection scenarios)
      socket.on('proctor:violations_batch', async (violations) => {
        try {
          if (!Array.isArray(violations)) {
            socket.emit('error', { message: 'Invalid batch format' });
            return;
          }
          
          const attemptId = socket.examData?.attemptId;
          if (!attemptId) {
            socket.emit('error', { message: 'No active exam' });
            return;
          }
          
          // Process violations in sequence
          const results = [];
          for (const violation of violations) {
            const success = await proctorService.logViolation(
              socket.userId,
              {
                attemptId,
                type: violation.type,
                details: violation.details || {}
              }
            );
            results.push({ type: violation.type, success });
          }
          
          socket.emit('batch_processed', { 
            count: violations.length,
            successful: results.filter(r => r.success).length
          });
          
        } catch (error) {
          console.error('Error processing batch violations:', error);
          socket.emit('error', { message: 'Failed to process batch violations' });
        }
      });
      
      // Handle heartbeat (still active)
      socket.on('proctor:heartbeat', async (data) => {
        try {
          const attemptId = socket.examData?.attemptId || data.attemptId;
          if (!attemptId) return;
          
          // Update last activity timestamp
          socket.lastActivity = new Date();
          
          // Update exam status using examService
          await examService.updateExamStatus(attemptId, data.status || 'active');
          
        } catch (error) {
          console.error('Heartbeat error:', error);
        }
      });
      
      // Handle webcam frame processing
      socket.on('proctor:process_frame', async (frameData) => {
        try {
          if (!socket.examData?.attemptId) return;
          
          // Process webcam frame using existing service function
          const violations = proctorService.processWebcamFrame(frameData);
          
          // Log each detected violation
          if (violations.length > 0) {
            for (const violation of violations) {
              await proctorService.logViolation(
                socket.userId,
                {
                  attemptId: socket.examData.attemptId,
                  type: violation.type,
                  details: violation.details
                }
              );
              
              // Notify monitors about high severity violations
              if (violation.severity === 'high') {
                monitorNamespace.to(`monitor-${socket.examData.attemptId}`).emit('violation', {
                  attemptId: socket.examData.attemptId,
                  userId: socket.userId,
                  type: violation.type,
                  details: violation.details,
                  severity: violation.severity,
                  timestamp: new Date()
                });
              }
            }
          }
          
          // Send processing results back to client
          socket.emit('frame_processed', {
            violations,
            timestamp: new Date()
          });
          
        } catch (error) {
          console.error('Error processing webcam frame:', error);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log('Proctor client disconnected:', socket.id);
        
        if (socket.examData?.attemptId) {
          try {
            // Log disconnection as a violation
            await proctorService.logViolation(
              socket.userId,
              {
                attemptId: socket.examData.attemptId,
                type: 'proctor_disconnected',
                details: { 
                  socketId: socket.id,
                  timestamp: new Date()
                }
              }
            );
          } catch (error) {
            console.error('Error logging disconnect:', error);
          }
        }
      });
    });
  
    // Handle monitor connections (proctors/admins)
    monitorNamespace.on('connection', (socket) => {
      console.log('Monitor connected:', socket.id, 'User:', socket.userId, 'Role:', socket.userRole);
      
      // Join monitor room for specific exam attempt
      socket.on('monitor_attempt', async (attemptId) => {
        try {
          // Validate attempt exists
          const Attempt = require('./models/attempt');
          const attempt = await Attempt.findById(attemptId);
          
          if (!attempt) {
            socket.emit('error', { message: 'Invalid exam attempt' });
            return;
          }
          
          // Join monitor room
          socket.join(`monitor-${attemptId}`);
          
          // Get proctor status using existing service
          const proctorStatus = await proctorService.getProctorStatus(attemptId);
          
          socket.emit('proctor_status', proctorStatus);
          
          // Analyze proctor events
          if (attempt.proctorEvents && attempt.proctorEvents.length > 0) {
            const analysis = proctorService.analyzeProctorEvents(attempt.proctorEvents);
            socket.emit('proctor_analysis', analysis);
          }
          
        } catch (error) {
          console.error('Error monitoring attempt:', error);
          socket.emit('error', { message: 'Failed to monitor attempt' });
        }
      });
      
      // Send warning to exam-taker
      socket.on('send_warning', async (data) => {
        try {
          const { attemptId, message, severity = 'warning' } = data;
          
          // Send warning to student
          proctorNamespace.to(`attempt-${attemptId}`).emit('proctor_warning', {
            message,
            severity,
            timestamp: new Date()
          });
          
          // Log warning as a special type of violation
          await proctorService.logViolation(
            socket.userId, // Proctor's userId
            {
              attemptId,
              type: 'warning_sent',
              details: {
                message,
                severity,
                sentBy: socket.userId,
                timestamp: new Date()
              }
            }
          );
          
          socket.emit('warning_sent', { success: true });
          
        } catch (error) {
          console.error('Error sending warning:', error);
          socket.emit('error', { message: 'Failed to send warning' });
        }
      });
      
      // Terminate exam (severe violations)
      socket.on('terminate_exam', async (data) => {
        try {
          const { attemptId, reason } = data;
          
          // Only admins can terminate exams
          if (socket.userRole !== 'admin') {
            socket.emit('error', { message: 'Insufficient permissions to terminate exam' });
            return;
          }
          
          // Notify student
          proctorNamespace.to(`attempt-${attemptId}`).emit('exam_terminated', {
            reason,
            timestamp: new Date()
          });
          
          // Update exam status by completing it
          const Attempt = require('./models/attempt');
          await Attempt.findByIdAndUpdate(attemptId, {
            completed: true,
            completedAt: new Date(),
            terminationReason: reason,
            terminatedBy: socket.userId
          });
          
          // Log termination event
          await proctorService.logViolation(
            socket.userId,
            {
              attemptId,
              type: 'exam_terminated',
              details: {
                reason,
                terminatedBy: socket.userId,
                timestamp: new Date()
              }
            }
          );
          
          socket.emit('exam_terminated', { success: true });
          
        } catch (error) {
          console.error('Error terminating exam:', error);
          socket.emit('error', { message: 'Failed to terminate exam' });
        }
      });
      
      // Request live webcam monitoring
      socket.on('request_monitoring', async (attemptId) => {
        try {
          // Request monitoring from student
          proctorNamespace.to(`attempt-${attemptId}`).emit('monitoring_requested', {
            monitorId: socket.id,
            timestamp: new Date()
          });
          
          socket.emit('monitoring_requested', { success: true });
        } catch (error) {
          console.error('Error requesting monitoring:', error);
          socket.emit('error', { message: 'Failed to request monitoring' });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Monitor disconnected:', socket.id);
      });
    });
  
    // Periodic cleanup of idle sockets
    const cleanupInterval = 1000 * 60 * cleanupIntervalMinutes; // Convert to milliseconds
    const idleTimeout = 1000 * 60 * autoDisconnectMinutes; // Convert to milliseconds
    
    setInterval(() => {
      const currentTime = new Date();
      
      proctorNamespace.sockets.forEach(socket => {
        if (socket.examData && socket.lastActivity) {
          const idleTime = currentTime - socket.lastActivity;
          if (idleTime > idleTimeout) {
            console.log('Disconnecting idle socket:', socket.id);
            socket.disconnect(true);
          }
        }
      });
    }, cleanupInterval);
  
    // Return namespaces for external access if needed
    return {
      proctorNamespace,
      monitorNamespace
    };
  }
  
  module.exports = setupSocketHandlers;