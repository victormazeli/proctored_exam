// controllers/questionController.js
const Question = require('../models/question');
const Certification = require('../models/certification');
const { validationResult } = require('express-validator');

/**
 * Get questions by certification (API)
 * Used by exam system to fetch questions
 */
exports.getQuestionsByCertification = async (req, res) => {
  try {
    const { certificationId } = req.params;
    const { count, domain, exclude, difficulty } = req.query;
    
    // Build query
    const query = {
      certificationId,
      active: true
    };
    
    // Filter by domain if provided
    if (domain) {
      query.domain = domain;
    }
    
    // Filter by difficulty if provided
    if (difficulty) {
      const difficultyLevel = parseInt(difficulty);
      if (!isNaN(difficultyLevel) && difficultyLevel >= 1 && difficultyLevel <= 5) {
        query.difficulty = difficultyLevel;
      }
    }
    
    // Exclude specific questions if provided
    if (exclude) {
      const excludeIds = exclude.split(',');
      query._id = { $nin: excludeIds };
    }
    
    // Determine limit
    const limit = count ? parseInt(count) : 10;
    
    // Get random questions
    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: limit } },
      { $project: {
        text: 1,
        options: 1,
        domain: 1,
        difficulty: 1,
        tags: 1
      }}
    ]);
    
    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found'
      });
    }
    
    return res.json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (err) {
    console.error('Error fetching questions:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
};

/**
 * Get question by ID (API)
 */
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id)
      .select('-correctAnswers'); // Don't send correct answers to client
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    return res.json({
      success: true,
      question
    });
  } catch (err) {
    console.error('Error fetching question:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch question'
    });
  }
};

/**
 * Verify question answer (API)
 */
exports.verifyAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { userAnswers, timeSpent } = req.body;
    
    if (!userAnswers || !Array.isArray(userAnswers)) {
      return res.status(400).json({
        success: false,
        message: 'User answers must be provided as an array'
      });
    }
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Check if answers are correct
    // For single-answer questions
    if (question.correctAnswers.length === 1) {
      const isCorrect = userAnswers.length === 1 && 
                       userAnswers[0] === question.correctAnswers[0];
      
      // Update analytics
      await updateQuestionAnalytics(question, isCorrect, timeSpent);
      
      return res.json({
        success: true,
        correct: isCorrect,
        correctAnswers: question.correctAnswers
      });
    }
    
    // For multiple-answer questions
    // All correct options must be selected and no incorrect options
    const allCorrectSelected = question.correctAnswers.every(
      ans => userAnswers.includes(ans)
    );
    const noIncorrectSelected = userAnswers.every(
      ans => question.correctAnswers.includes(ans)
    );
    
    const isCorrect = allCorrectSelected && noIncorrectSelected;
    
    // Update analytics
    await updateQuestionAnalytics(question, isCorrect, timeSpent);
    
    return res.json({
      success: true,
      correct: isCorrect,
      correctAnswers: question.correctAnswers
    });
  } catch (err) {
    console.error('Error verifying answer:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify answer'
    });
  }
};

/**
 * Update question analytics
 * @param {Object} question - Question document
 * @param {boolean} isCorrect - Whether answer was correct
 * @param {number} timeSpent - Time spent in seconds
 */
async function updateQuestionAnalytics(question, isCorrect, timeSpent) {
  try {
    // Get current analytics
    const analytics = question.analytics || {
      timesAnswered: 0,
      timesCorrect: 0,
      avgTimeSpent: 0,
      difficultyRating: question.difficulty || 3
    };
    
    // Update analytics
    analytics.timesAnswered += 1;
    
    if (isCorrect) {
      analytics.timesCorrect += 1;
    }
    
    // Update average time spent
    if (timeSpent && timeSpent > 0) {
      const totalTimeSpent = analytics.avgTimeSpent * (analytics.timesAnswered - 1) + timeSpent;
      analytics.avgTimeSpent = totalTimeSpent / analytics.timesAnswered;
    }
    
    // Update difficulty rating based on success rate
    // More people getting it wrong = higher difficulty
    if (analytics.timesAnswered > 5) { // Only adjust after enough data
      const successRate = analytics.timesCorrect / analytics.timesAnswered;
      
      // Scale from 1-5: high success rate = lower difficulty
      let newDifficulty;
      if (successRate >= 0.9) newDifficulty = 1;
      else if (successRate >= 0.75) newDifficulty = 2;
      else if (successRate >= 0.6) newDifficulty = 3;
      else if (successRate >= 0.4) newDifficulty = 4;
      else newDifficulty = 5;
      
      // Smooth difficulty changes (70% old, 30% new)
      analytics.difficultyRating = 
        0.7 * analytics.difficultyRating + 0.3 * newDifficulty;
    }
    
    // Save updated analytics
    await Question.findByIdAndUpdate(question._id, {
      analytics
    });
  } catch (err) {
    console.error('Error updating question analytics:', err);
  }
}

/**
 * Flag question for review
 */
exports.flagQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be provided'
      });
    }
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Add flag to question
    const flags = question.flags || [];
    flags.push({
      userId: req.user._id,
      reason,
      comment: comment || '',
      timestamp: new Date(),
      status: 'pending'
    });
    
    await Question.findByIdAndUpdate(id, { flags });
    
    return res.json({
      success: true,
      message: 'Question flagged for review'
    });
  } catch (err) {
    console.error('Error flagging question:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to flag question'
    });
  }
};

/**
 * Get flagged questions (Admin)
 */
exports.getFlaggedQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || 'pending';
    
    // Find questions with flags
    const query = {
      'flags.status': status
    };
    
    const flaggedQuestions = await Question.find(query)
      .populate('certificationId', 'name')
      .populate('flags.userId', 'username')
      .sort({ 'flags.timestamp': -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const totalQuestions = await Question.countDocuments(query);
    
    res.render('admin/flagged-questions', {
      title: 'Flagged Questions',
      questions: flaggedQuestions,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalQuestions / limit),
        totalQuestions
      },
      status
    });
  } catch (err) {
    console.error('Error getting flagged questions:', err);
    req.flash('error_msg', 'Failed to load flagged questions');
    res.redirect('/admin/questions');
  }
};

/**
 * Update flag status (Admin)
 */
exports.updateFlagStatus = async (req, res) => {
  try {
    const { id, flagId } = req.params;
    const { status, resolution } = req.body;
    
    if (!['resolved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Find and update the specific flag
    const flagIndex = question.flags.findIndex(
      flag => flag._id.toString() === flagId
    );
    
    if (flagIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Flag not found'
      });
    }
    
    question.flags[flagIndex].status = status;
    question.flags[flagIndex].resolution = resolution || '';
    question.flags[flagIndex].resolvedBy = req.user._id;
    question.flags[flagIndex].resolvedAt = new Date();
    
    await question.save();
    
    return res.json({
      success: true,
      message: `Flag marked as ${status}`
    });
  } catch (err) {
    console.error('Error updating flag status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update flag status'
    });
  }
};