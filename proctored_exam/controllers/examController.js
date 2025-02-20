// controllers/examController.js
const Exam = require('../models/exam');
const Question = require('../models/question');
const Attempt = require('../models/attempt');
const Certification = require('../models/certification');
const User = require('../models/user');
const examService = require('../services/examService');
const analyticsService = require('../services/analyticsService');
const aiService = require('../services/aiService');

/**
 * Display certification selection page
 */
exports.selectCertification = async (req, res) => {
  try {
    const certifications = await Certification.find({ active: true });
    const userProgress = await examService.getUserCertificationProgress(req.user._id);
    
    res.render('exams/select', {
      title: 'Select Certification',
      certifications,
      userProgress
    });
  } catch (err) {
    console.error('Error selecting certification:', err);
    req.flash('error_msg', 'Failed to load certifications');
    res.redirect('/');
  }
};

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
      systemRequirements
    });
  } catch (err) {
    console.error('Error loading exam instructions:', err);
    req.flash('error_msg', 'Failed to load exam instructions');
    res.redirect('/exams/select');
  }
};

/**
 * Start a new exam attempt
 */
exports.startExam = async (req, res) => {
  try {
    const examId = req.params.examId;
    const exam = await Exam.findById(examId);
    if (!exam || !exam.active) {
      req.flash('error_msg', 'Exam not found or inactive');
      return res.redirect('/exams/select');
    }
    
    const certification = await Certification.findById(exam.certificationId);
    
    // Generate questions for this attempt
    let questions;
    
    if (req.query.adaptive === 'true') {
      // Use AI service to select personalized questions
      questions = await aiService.selectAdaptiveQuestions(
        req.user._id,
        exam.certificationId,
        exam.questionCount
      );
    } else {
      // Select standard questions
      questions = await examService.getExamQuestions(
        examId, 
        exam.questionCount, 
        exam.randomize
      );
    }
    
    if (!questions || questions.length === 0) {
      req.flash('error_msg', 'Failed to generate exam questions');
      return res.redirect(`/exams/${exam.certificationId}/select`);
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
    
    // Format questions for the front-end (don't include correct answers!)
    const formattedQuestions = questions.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options,
      domain: q.domain
    }));
    
    // Set up exam session
    const timeLimit = exam.timeLimit || certification.timeLimit;
    
    res.render('exams/exam', {
      title: exam.name,
      exam: {
        ...exam.toObject(),
        timeLimit
      },
      certification,
      attempt: attempt._id,
      questions: formattedQuestions,
      proctorEnabled: req.user.settings?.proctorEnabled !== false
    });
  } catch (err) {
    console.error('Error starting exam:', err);
    req.flash('error_msg', 'Failed to start exam');
    res.redirect('/exams/select');
  }
};

/**
 * Submit exam answers via AJAX
 */
exports.submitExamAnswers = async (req, res) => {
  try {
    const { attemptId, answers, timeSpentPerQuestion, flaggedQuestions, proctorEvents } = req.body;
    
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
    const examResults = await examService.calculateExamResults(attempt);
    
    // Update attempt with results
    attempt.score = examResults.score;
    attempt.passed = examResults.passed;
    attempt.endTime = new Date();
    attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
    attempt.completed = true;
    
    await attempt.save();
    
    // Update analytics
    await analyticsService.processCompletedAttempt(attempt);
    
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
    return res.status(500).json({ success: false, message: 'Failed to submit exam' });
  }
};

/**
 * Display exam results
 */
exports.examResults = async (req, res) => {
  try {
    const attemptId = req.params.attemptId;
    
    // Get attempt with populated questions
    const attempt = await Attempt.findOne({
      _id: attemptId,
      userId: req.user._id
    });
    
    if (!attempt) {
      req.flash('error_msg', 'Exam attempt not found');
      return res.redirect('/exams/select');
    }
    
    const exam = await Exam.findById(attempt.examId);
    const certification = await Certification.findById(attempt.certificationId);
    
    // Get full question details
    const questionIds = attempt.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    // Map questions with user answers
    const questionsWithAnswers = attempt.questions.map(attemptQuestion => {
      const fullQuestion = questions.find(q => q._id.toString() === attemptQuestion.questionId.toString());
      return {
        ...fullQuestion.toObject(),
        userAnswers: attemptQuestion.userAnswers,
        correct: attemptQuestion.correct,
        timeSpent: attemptQuestion.timeSpent,
        flagged: attemptQuestion.flagged
      };
    });
    
    // Get improvement recommendations
    const recommendations = await aiService.getImprovementRecommendations(
      req.user._id,
      attempt.certificationId,
      attempt.score.byDomain
    );
    
    // Get proctor violations summary
    const proctorSummary = examService.summarizeProctorEvents(attempt.proctorEvents);
    
    res.render('exams/results', {
      title: 'Exam Results',
      attempt,
      exam,
      certification,
      questions: questionsWithAnswers,
      recommendations,
      proctorSummary
    });
  } catch (err) {
    console.error('Error displaying results:', err);
    req.flash('error_msg', 'Failed to load exam results');
    res.redirect('/exams/select');
  }
};

/**
 * Resume an incomplete exam
 */
exports.resumeExam = async (req, res) => {
  try {
    const attempt = await Attempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      completed: false
    });
    
    if (!attempt) {
      req.flash('error_msg', 'No incomplete exam found or unauthorized');
      return res.redirect('/exams/select');
    }
    
    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      req.flash('error_msg', 'Exam not found');
      return res.redirect('/exams/select');
    }
    
    const certification = await Certification.findById(exam.certificationId);
    
    // Get questions for this attempt
    const questionIds = attempt.questions.map(q => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    
    // Format questions for the frontend (don't include correct answers!)
    const formattedQuestions = questions.map(q => ({
      id: q._id,
      text: q.text,
      options: q.options,
      domain: q.domain
    }));
    
    // Calculate remaining time
    const timeLimit = exam.timeLimit || certification.timeLimit;
    const elapsedSeconds = Math.floor((new Date() - attempt.startTime) / 1000);
    const remainingSeconds = Math.max(0, timeLimit * 60 - elapsedSeconds);
    
    res.render('exams/resumeExam', {
      title: `Resume ${exam.name}`,
      exam: {
        ...exam.toObject(),
        remainingSeconds
      },
      certification,
      attempt: attempt._id,
      questions: formattedQuestions,
      proctorEnabled: req.user.settings?.proctorEnabled !== false,
      userAnswers: attempt.questions.reduce((acc, q) => {
        acc[q.questionId] = q.userAnswers;
        return acc;
      }, {}),
      flaggedQuestions: attempt.questions
        .filter(q => q.flagged)
        .map(q => q.questionId)
    });
  } catch (err) {
    console.error('Error resuming exam:', err);
    req.flash('error_msg', 'Failed to resume exam');
    res.redirect('/exams/select');
  }
};