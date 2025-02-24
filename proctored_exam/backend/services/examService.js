/**
 * services/examService.js
 * Handles exam business logic and database interactions
 */

const mongoose = require('mongoose');
const Exam = require('../models/exam');
const ExamAttempt = require('../models/attempt');
const Question = require('../models/question');
const Certification = require('../models/certification');
const User = require('../models/user');
// const ProctorLog = require('../models/ProctorLog');

/**
 * Create a new exam attempt for a user
 * @param {string} userId - User ID
 * @param {string} certificationId - Certification ID
 * @param {boolean} proctored - Whether the exam is proctored
 * @returns {Promise<Object>} Created exam attempt
 */
exports.createExamAttempt = async (userId, certificationId, proctored = true) => {
  try {
    // Get certification to determine exam settings
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      throw new Error('Certification not found');
    }

    // Get questions for this certification
    const questions = await Question.aggregate([
      { $match: { certification: mongoose.Types.ObjectId(certificationId), active: true } },
      { $sample: { size: certification.questionCount || 60 } }
    ]);

    if (questions.length < 10) {
      throw new Error('Not enough questions available for this certification');
    }

    // Create the exam attempt
    const examAttempt = new ExamAttempt({
      user: userId,
      certification: certificationId,
      questions: questions.map(q => ({
        question: q._id,
        userAnswer: null,
        correct: null,
        timeSpent: 0
      })),
      timeLimit: certification.timeLimit || 180,
      proctored,
      startTime: new Date(),
      status: 'in_progress',
      proctorEvents: [] // Initialize empty proctor events array
    });

    // Save and return the attempt
    await examAttempt.save();

    // Update user metrics
    await User.findByIdAndUpdate(userId, {
      $inc: { 'metrics.totalAttempts': 1 }
    });

    return examAttempt;
  } catch (error) {
    console.error('Error creating exam attempt:', error);
    throw error;
  }
};

/**
 * Update exam heartbeat status
 * @param {string} attemptId - Exam attempt ID
 * @param {string} status - Should be 'active' for heartbeats
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Updated attempt
 */
exports.updateExamStatus = async (attemptId, status = 'active', options = {}) => {
    try {
      if (!attemptId) {
        throw new Error('Attempt ID is required');
      }
  
      // For heartbeats, we're just updating the lastProctorHeartbeat
      if (status === 'active') {
        return await ExamAttempt.findByIdAndUpdate(
          attemptId, 
          { lastProctorHeartbeat: options.lastActivity || new Date() },
          { new: true }
        );
      }
      
      // This function shouldn't be used for other status changes
      // Those should go through specific functions like completeExam or terminateExam
      throw new Error('Invalid status for heartbeat update. Use appropriate functions for state changes.');
      
    } catch (error) {
      console.error('Error updating exam heartbeat:', error);
      throw error;
    }
  };

/**
 * Get active exam attempt
 * @param {string} attemptId - Attempt ID
 * @returns {Promise<Object>} Exam attempt with populated questions
 */
exports.getActiveExamAttempt = async (attemptId) => {
  try {
    const attempt = await ExamAttempt.findById(attemptId)
      .populate({
        path: 'questions.question',
        select: 'text options explanation category difficulty'
      })
      .populate('certification', 'name code provider passingScore')
      .populate('user', 'username');

    if (!attempt) {
      throw new Error('Exam attempt not found');
    }

    if (attempt.status === 'completed' || attempt.status === 'terminated') {
      throw new Error('This exam has already been completed or terminated');
    }

    return attempt;
  } catch (error) {
    console.error('Error fetching active exam:', error);
    throw error;
  }
};

/**
 * Submit answer for question
 * @param {string} attemptId - Attempt ID
 * @param {number} questionIndex - Question index in the attempt
 * @param {string|string[]} answer - User's answer
 * @param {number} timeSpent - Time spent on question in seconds
 * @returns {Promise<Object>} Updated attempt
 */
exports.submitAnswer = async (attemptId, questionIndex, answer, timeSpent) => {
  try {
    const attempt = await ExamAttempt.findById(attemptId)
      .populate('questions.question');
    
    if (!attempt) {
      throw new Error('Exam attempt not found');
    }

    if (attempt.status !== 'in_progress') {
      throw new Error('Cannot submit answer for a non-active exam');
    }

    if (questionIndex < 0 || questionIndex >= attempt.questions.length) {
      throw new Error('Invalid question index');
    }

    const questionData = attempt.questions[questionIndex];
    const questionDoc = questionData.question;

    // Determine if answer is correct
    let isCorrect = false;
    if (Array.isArray(answer)) {
      // Multiple choice question
      const correctAnswers = questionDoc.options
        .filter(opt => opt.isCorrect)
        .map(opt => opt._id.toString());
      
      isCorrect = answer.length === correctAnswers.length &&
        answer.every(a => correctAnswers.includes(a.toString()));
    } else {
      // Single answer question
      const correctAnswer = questionDoc.options.find(opt => opt.isCorrect);
      isCorrect = correctAnswer && correctAnswer._id.toString() === answer.toString();
    }

    // Update the question in the attempt
    attempt.questions[questionIndex].userAnswer = answer;
    attempt.questions[questionIndex].correct = isCorrect;
    attempt.questions[questionIndex].timeSpent = timeSpent;

    // Update attempt's last activity time
    attempt.lastActivity = new Date();

    await attempt.save();
    return attempt;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

/**
 * Complete an exam attempt
 * @param {string} attemptId - Attempt ID
 * @returns {Promise<Object>} Completed attempt with results
 */
exports.completeExam = async (attemptId) => {
  try {
    const attempt = await ExamAttempt.findById(attemptId)
      .populate('certification')
      .populate('user');
    
    if (!attempt) {
      throw new Error('Exam attempt not found');
    }

    if (attempt.status === 'completed') {
      throw new Error('This exam has already been completed');
    }

    // Calculate results
    const totalQuestions = attempt.questions.length;
    const answeredQuestions = attempt.questions.filter(q => q.userAnswer !== null).length;
    const correctAnswers = attempt.questions.filter(q => q.correct === true).length;
    
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= attempt.certification.passingScore;
    
    // Calculate total time spent
    const endTime = new Date();
    const totalTimeSpent = Math.round(
      (endTime - new Date(attempt.startTime)) / 1000 / 60
    );

    // Update the attempt
    attempt.status = 'completed';
    attempt.endTime = endTime;
    attempt.score = score;
    attempt.passed = passed;
    attempt.totalTimeSpent = totalTimeSpent;
    attempt.answeredQuestions = answeredQuestions;
    
    await attempt.save();

    // Update user metrics
    await User.findByIdAndUpdate(attempt.user._id, {
      $inc: {
        'metrics.examsPassed': passed ? 1 : 0,
        'metrics.totalTimeSpent': totalTimeSpent
      }
    });

    // Update the running average score
    const user = await User.findById(attempt.user._id);
    const totalAttempts = user.metrics.totalAttempts;
    const newAvgScore = ((user.metrics.averageScore || 0) * (totalAttempts - 1) + score) / totalAttempts;
    
    await User.findByIdAndUpdate(attempt.user._id, {
      'metrics.averageScore': Math.round(newAvgScore)
    });

    return attempt;
  } catch (error) {
    console.error('Error completing exam:', error);
    throw error;
  }
};

/**
 * Logs a proctoring heartbeat
 * @param {string} attemptId - Exam attempt ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
exports.logProctorHeartbeat = async (attemptId, userId) => {
  try {
    // Update the last activity time on the attempt
    await ExamAttempt.findByIdAndUpdate(attemptId, {
      lastProctorHeartbeat: new Date()
    });
  } catch (error) {
    console.error('Error logging proctor heartbeat:', error);
    throw error;
  }
};

/**
 * Terminate an exam due to proctoring violation
 * @param {string} attemptId - Exam attempt ID
 * @param {Object} terminationDetails - Details about termination
 * @returns {Promise<Object>} Updated attempt
 */
exports.terminateExam = async (attemptId, terminationDetails = {}) => {
  try {
    const attempt = await ExamAttempt.findById(attemptId);
    
    if (!attempt) {
      throw new Error('Exam attempt not found');
    }

    if (attempt.status === 'completed' || attempt.status === 'terminated') {
      throw new Error('This exam has already been completed or terminated');
    }

    // Update the attempt
    const updates = {
      status: 'terminated',
      endTime: new Date(),
      terminationReason: terminationDetails.reason || 'Proctoring violation'
    };

    // Add termination metadata if provided
    if (terminationDetails.terminatedBy) {
      updates.terminatedBy = terminationDetails.terminatedBy;
    }

    if (terminationDetails.timestamp) {
      updates.terminationTime = terminationDetails.timestamp;
    }
    
    const updatedAttempt = await ExamAttempt.findByIdAndUpdate(
      attemptId,
      updates,
      { new: true }
    );

    // // Log to ProctorLog
    // await ProctorLog.create({
    //   examAttempt: attemptId,
    //   user: attempt.user,
    //   eventType: 'exam_terminated',
    //   description: terminationDetails.reason || 'Exam terminated by proctor',
    //   metadata: {
    //     terminatedBy: terminationDetails.terminatedBy,
    //     severity: terminationDetails.severity || 'high'
    //   },
    //   timestamp: terminationDetails.timestamp || new Date()
    // });

    return updatedAttempt;
  } catch (error) {
    console.error('Error terminating exam:', error);
    throw error;
  }
};

/**
 * Check for exams that have timed out
 * Intended to be run by a scheduled job
 * @returns {Promise<number>} Count of terminated exams
 */
exports.terminateTimedOutExams = async () => {
  try {
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - 5); // 5 minute timeout
    
    const result = await ExamAttempt.updateMany(
      {
        status: 'in_progress',
        lastProctorHeartbeat: { $lt: timeoutThreshold }
      },
      {
        status: 'terminated',
        endTime: new Date(),
        terminationReason: 'Proctoring session timed out'
      }
    );

    return result.nModified;
  } catch (error) {
    console.error('Error terminating timed out exams:', error);
    throw error;
  }
};

/**
 * Get proctoring violations for an exam attempt
 * @param {string} attemptId - Exam attempt ID
 * @returns {Promise<Array>} Array of violation events
 */
exports.getProctorViolations = async (attemptId) => {
  try {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Exam attempt not found');
    }
    
    // Filter proctor events to only include violations
    // (exclude heartbeats, connections, etc.)
    const violationTypes = [
      'face_not_visible',
      'multiple_faces',
      'attention_loss',
      'tab_switch',
      'window_blur',
      'keyboard_violation'
    ];
    
    return (attempt.proctorEvents || []).filter(
      event => violationTypes.includes(event.type)
    );
  } catch (error) {
    console.error('Error getting proctor violations:', error);
    throw error;
  }
};

/**
 * Get all active proctored exams
 * Used for monitoring dashboard
 * @returns {Promise<Array>} Active proctored exams
 */
exports.getActiveProctoringSessions = async () => {
  try {
    return await ExamAttempt.find({
      status: 'in_progress',
      proctored: true,
      startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('user', 'username email')
    .populate('certification', 'name');
  } catch (error) {
    console.error('Error fetching active proctoring sessions:', error);
    throw error;
  }
};