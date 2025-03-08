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
 * Display certification selection page
 */
exports.selectCertification = async (req, res) => {
  try {
    const certifications = await Certification.find({ active: true });
    const userProgress = await examService.getUserCertificationProgress(req.user._id);
    
    res.render('exams/select', {
      title: 'Select Certification',
      certifications,
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

/**
 * Start a new exam attempt
 */
// exports.startExam = async (req, res) => {
//   try {
//     const examId = req.params.examId;
//     const exam = await Exam.findById(examId);
//     if (!exam || !exam.active) {
//       req.flash('error_msg', 'Exam not found or inactive');
//       return res.redirect('/exams/select');
//     }
    
//     const certification = await Certification.findById(exam.certificationId);
    
//     // Generate questions for this attempt
//     let questions;
    
//     if (req.query.adaptive === 'true') {
//       // Use AI service to select personalized questions
//       questions = await aiService.selectAdaptiveQuestions(
//         req.user._id,
//         exam.certificationId,
//         exam.questionCount
//       );
//     } else {
//       // Select standard questions
//       questions = await examService.getExamQuestions(
//         examId, 
//         exam.questionCount, 
//         exam.randomize
//       );
//     }
    
//     if (!questions || questions.length === 0) {
//       req.flash('error_msg', 'Failed to generate exam questions');
//       return res.redirect(`/exams/${exam.certificationId}/select`);
//     }
    
//     // Create new attempt
//     const attempt = new Attempt({
//       userId: req.user._id,
//       examId: exam._id,
//       certificationId: exam.certificationId,
//       startTime: new Date(),
//       completed: false,
//       questions: questions.map(q => ({
//         questionId: q._id,
//         userAnswers: [],
//         correct: false,
//         timeSpent: 0,
//         flagged: false
//       })),
//       proctorEvents: []
//     });
    
//     await attempt.save();
    
//     // Update user metrics
//     await User.findByIdAndUpdate(req.user._id, {
//       $inc: { 'metrics.totalAttempts': 1 }
//     });
    
//     // Format questions for the front-end (don't include correct answers!)
//     const formattedQuestions = questions.map(q => ({
//       id: q._id,
//       text: q.text,
//       options: q.options,
//       domain: q.domain
//     }));
    
//     // Set up exam session
//     const timeLimit = exam.timeLimit || certification.timeLimit;
    
//     res.render('exams/exam', {
//       title: exam.name,
//       exam: {
//         ...exam.toObject(),
//         timeLimit
//       },
//       certification,
//       attempt: attempt._id,
//       questions: formattedQuestions,
//       proctorEnabled: req.user.settings?.proctorEnabled !== false
//     });
//   } catch (err) {
//     console.error('Error starting exam:', err);
//     req.flash('error_msg', 'Failed to start exam');
//     res.redirect('/exams/select');
//   }
// };

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
                // Calculate how far they've progressed
                questionsAnswered: existingAttempt.questions.filter(q => 
                  q.userAnswers && q.userAnswers.length > 0
                ).length,
                totalQuestions: existingAttempt.questions.length,
                timeSpent: existingAttempt.timeSpent || 0
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