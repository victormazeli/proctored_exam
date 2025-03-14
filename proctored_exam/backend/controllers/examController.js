// controllers/examController.js
const Exam = require('../models/exam');
const Question = require('../models/question');
const Attempt = require('../models/attempt');
const Certification = require('../models/certification');
const User = require('../models/user');
const examService = require('../services/examService');
// const analyticsService = require('../services/analyticsService');
const aiService = require('../services/aiService');
const { body } = require('express-validator');


/**
 * Display available exams for a certification
 */
exports.selectExam = async (req, res) => {
  try {
    const certification = await Certification.findById(req.params.certId);
    if (!certification) {
      req.flash('error_msg', 'Certification not found');
      return res.redirect('/exams/select');
    }
    
    const exams = await Exam.find({ 
      certificationId: certification._id,
      active: true
    });
    
    // Get user's previous attempts for this certification
    const attempts = await Attempt.find({
      userId: req.user._id,
      certificationId: certification._id,
      completed: true
    }).sort({ createdAt: -1 });
    
    // Get recommendations based on user's performance
    const recommendations = await aiService.getRecommendedExams(
      req.user._id,
      certification._id
    );
    
    res.render('exams/selectExam', {
      title: `${certification.name} Exams`,
      certification,
      exams,
      attempts,
      recommendations
    });
  } catch (err) {
    console.error('Error selecting exam:', err);
    req.flash('error_msg', 'Failed to load exams');
    res.redirect('/exams/select');
  }
};

/**
 * Display exam instructions and preparation
 */
exports.examInstructions = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      req.flash('error_msg', 'Exam not found');
      return res.redirect('/exams/select');
    }
    
    const certification = await Certification.findById(exam.certificationId);
    
    // Check system requirements (webcam, etc.)
    const systemRequirements = {
      webcamRequired: true,
      fullScreenRequired: true,
      browserSupported: true, // This would be determined by user agent
      estimatedTime: exam.timeLimit || certification.timeLimit
    };
    
    res.render('exams/instructions', {
      title: `${exam.name} - Instructions`,
      exam,
      certification,
      systemRequirements,
      body: ''
    });
  } catch (err) {
    console.error('Error loading exam instructions:', err);
    req.flash('error_msg', 'Failed to load exam instructions');
    res.redirect('/exams/select');
  }
};


exports.getCertifications = async (req, res) => {
  try {

    const certifications = await Certification.find();
    
    return res.status(200).json({
      success: true,
      data: certifications
    })
  } catch (err) {
    console.error('Error loading certifications:', err);
    return res.status(500).json({
      success: false,
      message: 'Error loading certifications'
    })
  }
};


exports.getExams = async (req, res) => {
  try {
    const certificationId = req.query.certification || null;
    const examId = req.query.examId || null;
    
    const query = {};
    if (certificationId) {
      query.certificationId = certificationId;
    }

    if (examId) {
      query._id = examId;
    }
    
    const exams = await Exam.find(query)
      .populate('certificationId', 'name code passingScore')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    

    return res.status(200).json({
      success: true,
      data: exams,
    });

  } catch (err) {
    console.error('Error loading exams:', err);
     return res.status(500).json({ 
      success: false, 
      message: 'Error loading exams' 
    });
  }
};

exports.getExam = async (req, res) => {
  try {
    const examId = req.query.examId || null;
    
    const exam = await Exam.findOne({_id: examId})
      .populate('certificationId', 'name code passingScore')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    

    return res.status(200).json({
      success: true,
      data: exam,
    });

  } catch (err) {
    console.error('Error loading exams:', err);
     return res.status(500).json({ 
      success: false, 
      message: 'Error loading exams' 
    });
  }
};



exports.startExam = async (req, res) => {
  try {
    const examId = req.params.examId;
    const exam = await Exam.findById(examId);
    
    if (!exam || !exam.active) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or inactive'
      });
    }
    req.user = await User.findById('67c404114d7db32d2f7e80c9');
    
    const certification = await Certification.findById(exam.certificationId);
    
    // Generate questions
    let questions;
    if (req.query.adaptive === 'true') {
      questions = await aiService.selectAdaptiveQuestions(
        req.user._id,
        exam.certificationId,
        exam.questionCount
      );
    } else {
      questions = await getRandomQuestions(
        exam.certificationId, 
        exam.questionCount
      );
    }
    
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate exam questions'
      });
    }
    
    // Create new attempt
    const attempt = new Attempt({
      userId: req.user._id,
      examId: exam._id,
      certificationId: exam.certificationId,
      startTime: new Date(),
      completed: false,
      questions: questions.map(q => ({
        questionId: q._id,
        userAnswers: [],
        correct: false,
        timeSpent: 0,
        flagged: false
      })),
      proctorEvents: []
    });
    
    await attempt.save();
    
    // Update user metrics
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'metrics.totalAttempts': 1 }
    });
    
    // Format questions for frontend (exclude correct answers)
    const formattedQuestions = questions.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options.map(opt => ({
        id: opt._id || opt.id,
        text: opt.text
      })),
      domain: q.domain
    }));

    // Get time limit from exam or certification
    const timeLimit = exam.timeLimit || certification.timeLimit;

    // Construct response matching ExamData interface
    const examData = {
      id: attempt._id.toString(), // Use attempt ID as the exam session ID
      timeLimit: timeLimit * 60, // Convert minutes to seconds
      questions: formattedQuestions,
      proctorEnabled: req.user.settings?.proctorEnabled !== false,
      answers: {}, // Initialize empty answers object
      timeSpent: {}, // Initialize empty time tracking
      flagged: [], // Initialize empty flagged questions array
      currentQuestionIndex: 0,
      startTime: Date.now(),
      endTime: null,
      proctorEvents: [],
      
      // Additional metadata that might be useful for the frontend
      metadata: {
        examName: exam.name,
        certificationName: certification.name,
        totalQuestions: formattedQuestions.length,
        allowReview: exam.allowReview !== false,
        randomizeQuestions: exam.randomize === true
      }
    };

    return res.status(200).json({
      success: true,
      data: examData
    });

  } catch (err) {
    console.error('Error starting exam:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to start exam',
      data: null
    });
  }
};

exports.checkExamAttempt = async(req, res) => {
  try {
    const examId = req.params.examId;
    const exam = await Exam.findById(examId);
    
    if (!exam || !exam.active) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or inactive'
      });
    }
    req.user = await User.findById('67c404114d7db32d2f7e80c9');

        // Check for existing incomplete attempt
        const existingAttempt = await Attempt.findOne({
          userId: req.user._id,
          examId: exam._id,
          completed: false
        }).sort({ startTime: -1 }); // Get the most recent one if multiple
        
        // If there's an existing attempt and user didn't explicitly request a new one
        if (existingAttempt && req.query.forceNew !== 'true') {
          return res.status(200).json({
            success: true,
            data: {
              hasExistingAttempt: true,
              existingAttempt: {
                id: existingAttempt._id,
                startTime: existingAttempt.startTime,
                lastUpdated: existingAttempt.updatedAt,
                completed: existingAttempt.completed,
                // Calculate how far they've progressed
                questionsAnswered: existingAttempt.questions.filter(q => 
                  q.userAnswers && q.userAnswers.length > 0
                ).length,
                totalQuestions: existingAttempt.questions.length,
                timeSpent: existingAttempt.timeSpent || 0,
                score: existingAttempt.completed ? existingAttempt.score?.overall : undefined,
                passed: existingAttempt.completed ? existingAttempt.passed : undefined
              }
            }
          });
        }


        return res.status(200).json({
          success: true,
          data: {
            hasExistingAttempt: false
          }
        });
    
    
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check exam attempt',
      data: null
    });
  }
}

/**
 * Submit exam answers via AJAX
 */
exports.submitExamAnswers = async (req, res) => {
  try {
    const { attemptId, answers, timeSpentPerQuestion, flaggedQuestions, proctorEvents } = req.body;
    req.user = await User.findById('67c404114d7db32d2f7e80c9');
    // Verify user owns this attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id
    });
    
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }
    
    if (attempt.completed) {
      return res.status(400).json({ success: false, message: 'Exam already completed' });
    }
    
    // Update attempt with user answers and metadata
    attempt.questions.forEach((question, index) => {
      if (answers[question.questionId]) {
        question.userAnswers = Array.isArray(answers[question.questionId]) 
          ? answers[question.questionId] 
          : [answers[question.questionId]];
      }
      
      if (timeSpentPerQuestion[question.questionId]) {
        question.timeSpent = timeSpentPerQuestion[question.questionId];
      }
      
      if (flaggedQuestions && flaggedQuestions.includes(question.questionId)) {
        question.flagged = true;
      }
    });
    
    // Add proctor events if any
    if (proctorEvents && proctorEvents.length) {
      attempt.proctorEvents = [
        ...attempt.proctorEvents,
        ...proctorEvents.map(event => ({
          time: new Date(event.time),
          type: event.type,
          details: event.details
        }))
      ];
    }
    
    // Calculate results
    const examResults = await calculateExamResults(attempt);
    
    // Update attempt with results
    attempt.score = examResults.score;
    attempt.passed = examResults.passed;
    attempt.endTime = new Date();
    attempt.timeSpent = examResults.timeSpent
    attempt.completed = true;
    
    await attempt.save();
    
    // Update analytics
    // await analyticsService.processCompletedAttempt(attempt);
    
    // Update user metrics
    if (examResults.passed) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'metrics.examsPassed': 1 }
      });
    }
    
    return res.json({
      success: true,
      attemptId: attempt._id,
      results: {
        score: examResults.score.overall,
        passed: examResults.passed,
        domainScores: examResults.score.byDomain
      }
    });
  } catch (err) {
    console.error('Error submitting exam:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit exam', data: null });
  }
};

/**
 * Display exam results
 */
exports.examResults = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    req.user = await User.findById('67c404114d7db32d2f7e80c9');
    
    // Get attempt with populated questions
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
        data: null
      });
    }
    
    const exam = await Exam.findById(attempt.examId);
    const certification = await Certification.findById(attempt.certificationId);
    
    // Get full question details
    const questionIds = attempt.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    const formattedQuestions = attempt.questions.map(attemptQuestion => {
      const fullQuestion = questions.find(q => 
        q._id.toString() === attemptQuestion.questionId.toString()
      );
      
      if (!fullQuestion) return null;
      
      // Find correct answers
      const correctAnswers = fullQuestion.options
        .filter(opt => opt.correct)
        .map(opt => (opt._id || opt.id).toString());
      
      return {
        id: fullQuestion._id.toString(),
        text: fullQuestion.text,
        options: fullQuestion.options.map(opt => ({
          id: (opt._id || opt.id).toString(),
          text: opt.text
        })),
        userAnswers: attemptQuestion.userAnswers || [],
        correctAnswers: correctAnswers,
        correct: attemptQuestion.correct,
        timeSpent: attemptQuestion.timeSpent || 0,
        flagged: attemptQuestion.flagged || false,
        domain: fullQuestion.domain,
        difficulty: fullQuestion.difficulty || 3,
        tags: fullQuestion.tags || [],
        explanation: fullQuestion.explanation || ''
      };
    }).filter(q => q !== null);
    
    // Get improvement recommendations
    const recommendations = await aiService.getImprovementRecommendations(
      req.user._id,
      attempt.certificationId,
      attempt.score.byDomain
    );
    
    // Get proctor violations summary
    const proctorSummary = summarizeProctorEvents(attempt.proctorEvents);
    
    const response = {
      success: true,
      data: {
        exam: {
          _id: exam._id,
          name: exam.name
        },
        certification: {
          _id: certification._id,
          name: certification.name,
          code: certification.code,
          passingScore: certification.passingScore || 70
        },
        attempt: {
          _id: attempt._id,
          examId: attempt.examId,
          userId: attempt.userId,
          startTime: attempt.startTime,
          endTime: attempt.endTime,
          timeSpent: attempt.timeSpent,
          score: attempt.score,
          passed: attempt.passed,
          questions: formattedQuestions,
          terminatedBy: attempt.terminatedBy
        },
        recommendations: {
          weakDomains: recommendations?.weakDomains || [],
          studyRecommendations: recommendations?.studyRecommendations || [],
          practiceStrategy: recommendations?.practiceStrategy || []
        },
        proctorSummary
      }
    };
    
    return res.status(200).json(response);
  } catch (err) {
    console.error('Error displaying results:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load exam results'
    });
  }
};

/**
 * Resume an incomplete exam
 */
exports.resumeExam = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    req.user = await User.findById('67c404114d7db32d2f7e80c9');
    
    // Find the existing incomplete attempt
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No incomplete exam found or unauthorized'
      });
    }
    
    // Get the exam and certification
    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    const certification = await Certification.findById(exam.certificationId);
    
    // Get questions for this attempt
    const questionIds = attempt.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    if (!questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to retrieve exam questions'
      });
    }
    
    // Format questions for frontend (exclude correct answers)
    const formattedQuestions = questions.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options.map(opt => ({
        id: opt._id || opt.id,
        text: opt.text
      })),
      domain: q.domain
    }));
    
    // Create answers object from attempt
    const answers = {};
    const timeSpent = {};
    const flagged = [];
    
    attempt.questions.forEach((q, index) => {
      // Map answers, using index as key for consistency with frontend
      if (q.userAnswers && q.userAnswers.length > 0) {
        // If there's only one answer, store it directly
        // Otherwise store as array to support multiple answers
        answers[index] = q.userAnswers.length === 1 ? q.userAnswers[0] : q.userAnswers;
      }
      
      // Track time spent per question
      if (q.timeSpent) {
        timeSpent[index] = q.timeSpent;
      }
      
      // Track flagged questions
      if (q.flagged) {
        flagged.push(index);
      }
    });
    
    // Get time limit from exam or certification
    const timeLimit = exam.timeLimit || certification.timeLimit;
    
    // Calculate time remaining (in seconds)
    let remainingTime = timeLimit * 60;
    if (attempt.timeSpent) {
      remainingTime = Math.max(0, timeLimit * 60 - attempt.timeSpent);
    }
    
    // Determine current question index (default to 0 if not stored)
    const currentQuestionIndex = attempt.currentQuestionIndex || 0;
    
    // Construct response matching ExamData interface
    const examData = {
      id: attempt._id.toString(),
      timeLimit: remainingTime, // Return remaining time rather than full time
      questions: formattedQuestions,
      proctorEnabled: req.user.settings?.proctorEnabled !== false,
      answers: answers,
      timeSpent: timeSpent,
      flagged: flagged,
      currentQuestionIndex: currentQuestionIndex,
      startTime: attempt.startTime.getTime(),
      endTime: null,
      proctorEvents: attempt.proctorEvents || [],
      
      // Additional metadata
      metadata: {
        examName: exam.name,
        certificationName: certification.name,
        totalQuestions: formattedQuestions.length,
        allowReview: exam.allowReview !== false,
        randomizeQuestions: exam.randomize === true,
        isResumed: true // Flag to indicate this is a resumed session
      }
    };
    
    // Update the attempt's last activity time
    attempt.updatedAt = new Date();
    await attempt.save();
    
    return res.status(200).json({
      success: true,
      data: examData
    });
    
  } catch (err) {
    console.error('Error resuming exam:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to resume exam',
      data: null
    });
  }
};

exports.saveProgress = async (req, res) => {
  const { answers, timeSpent, flagged } = req.body;
  try {
    req.user = await User.findById('67c404114d7db32d2f7e80c9');
    
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      completed: false
    });
    
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No active exam attempt found',
        data: null
      });
    }
    
    // Track if there were any meaningful changes
    let hasChanges = false;
    
    // Update the questions array with the progress data
    attempt.questions.forEach((question, index) => {
      // Only update user answers if they exist and are different from existing ones
      if (answers[index] !== undefined) {
        const newAnswers = Array.isArray(answers[index]) 
          ? answers[index]
          : [answers[index]];
          
        // Check if answers are different (avoiding unnecessary updates)
        const currentAnswerStr = JSON.stringify(question.userAnswers || []);
        const newAnswerStr = JSON.stringify(newAnswers);
        
        if (currentAnswerStr !== newAnswerStr) {
          question.userAnswers = newAnswers;
          hasChanges = true;
        }
      }
      
      // Update time spent only if different
      if (timeSpent[index] !== undefined && question.timeSpent !== timeSpent[index]) {
        question.timeSpent = timeSpent[index];
        hasChanges = true;
      }
      
      // Update flagged status only if different
      const shouldBeFlagged = flagged.includes(index);
      if (question.flagged !== shouldBeFlagged) {
        question.flagged = shouldBeFlagged;
        hasChanges = true;
      }
    });
    
    // Only proceed with saving if there were actual changes
    if (hasChanges) {
      // Update timeSpent on the attempt
      const totalTimeSpent = Object.values(timeSpent).reduce((sum, time) => sum + (time || 0), 0);
      attempt.timeSpent = totalTimeSpent;
      
      // Update lastSavedAt timestamp
      attempt.updatedAt = new Date();
      
      // Save the updated attempt
      await attempt.save();
      
      return res.status(200).json({
        success: true,
        message: 'Progress saved successfully',
        data: {
          attemptId: attempt._id
        }
      });
    } else {
      // No changes were made, so no need to save
      return res.status(200).json({
        success: true,
        message: 'No changes to save',
        data: {
          attemptId: attempt._id
        }
      });
    }
    
  } catch (err) {
    console.error('Error saving exam progress:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save exam progress',
      data: null
    });
  }
};

async function getRandomQuestions(certificationId, count) {
  return await Question.aggregate([
    { $match: { certificationId, active: true } },
    { $sample: { size: count } }
  ]);
}


/**
 * Calculate and save exam results for a completed attempt
 * @param {string} attemptId - The ID of the completed attempt
 * @returns {Promise<Object>} The calculated results
 */
 const calculateExamResults = async (attempt) => {
  try {
    // Get the exam
    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      throw new Error(`Exam with ID ${attempt.examId} not found`);
    }

    // Get certification for pass score requirement
    const certification = await Certification.findById(attempt.certificationId);
    if (!certification) {
      throw new Error(`Certification with ID ${attempt.certificationId} not found`);
    }

    // Get all questions to evaluate correctness
    const questionIds = attempt.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    // Create question map for quick lookup
    const questionMap = {};
    questions.forEach(q => {
      questionMap[q._id.toString()] = q;
    });

    // Track domain scores and total score
    const domainScores = {};
    let totalCorrect = 0;
    let totalQuestions = attempt.questions.length;

    // Evaluate each question
    for (const attemptQuestion of attempt.questions) {
      const question = questionMap[attemptQuestion.questionId.toString()];
      
      if (!question) {
        console.warn(`Question ${attemptQuestion.questionId} not found`);
        continue;
      }

      // Get domain or set default
      const domain = question.domain || "General";
      
      // Initialize domain score if not exists
      if (!domainScores[domain]) {
        domainScores[domain] = {
          correct: 0,
          total: 0,
          score: 0
        };
      }
      
      // Increment total count for this domain
      domainScores[domain].total++;
      
      // Determine if the answer is correct
      let isCorrect = false;
      
      // Skip evaluation if no answer
      if (!attemptQuestion.userAnswers || attemptQuestion.userAnswers.length === 0) {
        // Mark as incorrect (unanswered)
        attemptQuestion.correct = false;
      } 
      // Check for multiple-answer questions
      else if (question.multipleCorrect) {
        // For multiple-select, user must select all correct answers and no incorrect ones
        const correctOptionIds = question.options
          .filter(opt => opt.correct)
          .map(opt => opt._id.toString() || opt.id.toString());
        
        const userAnswerIds = attemptQuestion.userAnswers.map(id => id.toString());
        
        // Check if arrays are the same length and all items match
        isCorrect = 
          correctOptionIds.length === userAnswerIds.length &&
          correctOptionIds.every(id => userAnswerIds.includes(id));
        
        attemptQuestion.correct = isCorrect;
      } 
      // Single-answer questions
      else {
        const correctOption = question.options.find(opt => opt.correct);
        const correctId = correctOption ? (correctOption._id || correctOption.id).toString() : null;
        
        if (correctId) {
          isCorrect = attemptQuestion.userAnswers[0].toString() === correctId;
          attemptQuestion.correct = isCorrect;
        }
      }
      
      // Update domain and total score
      if (isCorrect) {
        domainScores[domain].correct++;
        totalCorrect++;
      }
    }
    
    // Calculate scores for each domain (as percentage)
    const domainScoresList = [];
    Object.keys(domainScores).forEach(domain => {
      const { correct, total } = domainScores[domain];
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      domainScores[domain].score = score;
      
      domainScoresList.push({
        domain,
        score,
        questionsCount: total
      });
    });
    
    // Calculate overall score
    const overallScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    // Determine if passed (using certification pass score or default 70%)
    const passingScore = certification.passingScore || 70;
    const passed = overallScore >= passingScore;
    
    // Calculate time metrics
    const endTime = new Date();
    let timeSpent = 0;
    
    // If we have individual question times, add them up
    if (attempt.questions.some(q => q.timeSpent)) {
      timeSpent = attempt.questions.reduce((total, q) => total + (q.timeSpent || 0), 0);
    } 
    // Otherwise calculate from start/end times
    else if (attempt.startTime) {
      timeSpent = Math.floor((endTime - attempt.startTime) / 1000);
    }
    
    // Create score object
    const scoreObject = {
      overall: overallScore,
      byDomain: domainScoresList
    };
    
    // Update the attempt with results
    attempt.score = scoreObject;
    attempt.passed = passed;
    attempt.completed = true;
    attempt.endTime = endTime;
    attempt.timeSpent = timeSpent;
    
    // Save the updated attempt
    await attempt.save();
    
    // Update user metrics
    await User.findByIdAndUpdate(attempt.userId, {
      $inc: {
        'metrics.completedExams': 1,
        'metrics.passedExams': passed ? 1 : 0
      }
    });
    
    // Return the calculated results
    return {
      attemptId: attempt._id,
      examId: attempt.examId,
      score: scoreObject,
      passed,
      timeSpent,
      totalCorrect,
      totalQuestions,
      passingScore
    };
  } catch (error) {
    console.error('Error calculating exam results:', error);
    throw error;
  }
 }


const summarizeProctorEvents = (proctorEvents) => {
  if (!proctorEvents || !Array.isArray(proctorEvents) || proctorEvents.length === 0) {
    return {
      totalEvents: 0,
      violationCount: 0,
      severityScore: 0,
      potentialCheating: false,
      summary: "No proctor events recorded",
      eventCategories: {},
      timeline: []
    };
  }

  // Initialize summary object
  const summary = {
    totalEvents: proctorEvents.length,
    violationCount: 0,
    severityScore: 0,
    potentialCheating: false,
    flaggedBehaviors: [],
    eventCategories: {},
    timeline: [],
    eventsByType: {}
  };

  // Define event categories and their severity weights
  const eventSeverity = {
    'tab_switch': 2,
    'page_exit_attempt': 3,
    'multiple_faces': 4,
    'no_face_detected': 3,
    'unknown_face': 5,
    'looking_away': 2,
    'speaking': 1,
    'mobile_device': 4,
    'prohibited_object': 3,
    'suspicious_movement': 3,
    'time_warning': 1,
    'proctor_initialized': 0,
    'proctor_initialization_failed': 1,
    'warning_displayed': 0,
    'warning_acknowledged': 0
  };

  // Define categories for events
  const eventCategories = {
    'navigation': ['tab_switch', 'page_exit_attempt'],
    'face_detection': ['multiple_faces', 'no_face_detected', 'unknown_face', 'looking_away'],
    'audio': ['speaking'],
    'objects': ['mobile_device', 'prohibited_object'],
    'movement': ['suspicious_movement'],
    'system': ['proctor_initialized', 'proctor_initialization_failed', 'warning_displayed', 'warning_acknowledged'],
    'time': ['time_warning']
  };

  // Group events by type
  proctorEvents.forEach(event => {
    const eventType = event.type;
    
    // Skip initialization events from violation count
    const isViolation = !['proctor_initialized', 'warning_displayed', 'warning_acknowledged'].includes(eventType);
    
    // Initialize if first occurrence of this type
    if (!summary.eventsByType[eventType]) {
      summary.eventsByType[eventType] = [];
    }
    
    // Add to events by type
    summary.eventsByType[eventType].push({
      time: event.time,
      details: event.details || {}
    });
    
    // Count violations
    if (isViolation) {
      summary.violationCount++;
    }
    
    // Add severity score
    summary.severityScore += (eventSeverity[eventType] || 1);
    
    // Find category for this event type
    for (const [category, types] of Object.entries(eventCategories)) {
      if (types.includes(eventType)) {
        if (!summary.eventCategories[category]) {
          summary.eventCategories[category] = 0;
        }
        summary.eventCategories[category]++;
        break;
      }
    }
    
    // Add to timeline
    summary.timeline.push({
      time: event.time,
      type: eventType,
      details: event.details || {}
    });
  });
  
  // Sort timeline by time
  summary.timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
  
  // Analyze for patterns that suggest cheating
  const tabSwitchCount = summary.eventsByType['tab_switch']?.length || 0;
  const faceIssues = (summary.eventsByType['multiple_faces']?.length || 0) + 
                    (summary.eventsByType['no_face_detected']?.length || 0) +
                    (summary.eventsByType['unknown_face']?.length || 0);
  const deviceDetections = summary.eventsByType['mobile_device']?.length || 0;
  
  // Determine if potential cheating occurred
  summary.potentialCheating = (
    summary.severityScore > 15 || 
    tabSwitchCount > 5 || 
    faceIssues > 3 || 
    deviceDetections > 0
  );
  
  // Identify specific flagged behaviors
  if (tabSwitchCount > 5) {
    summary.flaggedBehaviors.push('Excessive tab switching');
  }
  
  if (summary.eventsByType['page_exit_attempt']?.length > 2) {
    summary.flaggedBehaviors.push('Multiple attempts to leave the exam page');
  }
  
  if (summary.eventsByType['multiple_faces']?.length > 0) {
    summary.flaggedBehaviors.push('Multiple faces detected during exam');
  }
  
  if (summary.eventsByType['unknown_face']?.length > 0) {
    summary.flaggedBehaviors.push('Unrecognized face detected during exam');
  }
  
  if (summary.eventsByType['no_face_detected']?.length > 3) {
    summary.flaggedBehaviors.push('Candidate frequently not visible');
  }
  
  if (summary.eventsByType['mobile_device']?.length > 0) {
    summary.flaggedBehaviors.push('Mobile device detected during exam');
  }
  
  if (summary.eventsByType['prohibited_object']?.length > 0) {
    summary.flaggedBehaviors.push('Prohibited objects detected');
  }
  
  // Calculate frequency of events (events per minute)
  const firstEvent = new Date(summary.timeline[0]?.time);
  const lastEvent = new Date(summary.timeline[summary.timeline.length - 1]?.time);
  const durationMinutes = (lastEvent - firstEvent) / (1000 * 60);
  
  summary.eventsPerMinute = durationMinutes > 0 
    ? Math.round((summary.totalEvents / durationMinutes) * 10) / 10
    : 0;
  
  // Generate a text summary
  if (summary.violationCount === 0) {
    summary.summary = "No violations detected during the exam.";
  } else if (summary.potentialCheating) {
    summary.summary = `Potential exam integrity issues detected. ${summary.violationCount} violations recorded, with high-risk behaviors including: ${summary.flaggedBehaviors.join(', ')}.`;
  } else if (summary.violationCount < 3) {
    summary.summary = `Minor violations detected (${summary.violationCount} events), likely normal exam behavior.`;
  } else {
    summary.summary = `Moderate number of violations (${summary.violationCount} events) detected during the exam.`;
  }
  
  return summary;
};