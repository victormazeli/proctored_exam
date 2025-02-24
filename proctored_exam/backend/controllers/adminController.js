// controllers/adminController.js
const User = require('../models/user');
const Question = require('../models/question');
const Exam = require('../models/exam');
const Certification = require('../models/certification');
const Attempt = require('../models/attempt');
// const analyticsService = require('../services/analyticsService');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const mongoose = require('mongoose');

/**
 * Render admin dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    // Get system stats
    const stats = {
      userCount: await User.countDocuments(),
      certificationCount: await Certification.countDocuments({ active: true }),
      examCount: await Exam.countDocuments({ active: true }),
      questionCount: await Question.countDocuments({ active: true }),
      attemptCount: await Attempt.countDocuments({ completed: true }),
      lastWeekAttempts: await Attempt.countDocuments({
        completed: true,
        endTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    };
    
    // Get recent activity
    const recentAttempts = await Attempt.find({ completed: true })
      .sort({ endTime: -1 })
      .limit(10)
      .populate('userId', 'username email')
      .populate('examId', 'name')
      .populate('certificationId', 'name');
    
    // Get certification pass rates
    // const certPassRates = await analyticsService.getCertificationPassRates();
    const certPassRates = null;
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats,
      recentAttempts,
      certPassRates
    });
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    req.flash('error_msg', 'Failed to load dashboard data');
    res.status(500).render('errors/500');
  }
};

/**
 * Render user management page
 */
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Exclude the current admin user
    query._id = { $ne: req.user._id };
    
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    
    const users = await User.find(query)
      .select('username email role profile.name createdAt metrics')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.render('admin/users', {
      title: 'User Management',
      users,
      pagination: {
        page,
        limit,
        totalPages,
        totalUsers
      },
      search
    });
  } catch (err) {
    console.error('Error loading users:', err);
    req.flash('error_msg', 'Failed to load users');
    res.redirect('/admin');
  }
};

/**
 * Update user role
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    // Prevent changing own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot change your own role' 
      });
    }
    
    await User.findByIdAndUpdate(userId, { role });
    
    return res.json({ success: true });
  } catch (err) {
    console.error('Error updating user role:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update user role' 
    });
  }
};


/**
 * Get single certification
 */
exports.getCertification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const certification = await Certification.findById(id);
    if (!certification) {
      req.flash('error_msg', 'Certification not found');
      return res.redirect('/admin/certifications');
    }
    
    res.render('admin/certification', {
      title: certification.name,
      certification
    });
  } catch (err) {
    console.error('Error loading certification:', err);
    req.flash('error_msg', 'Failed to load certification');
    res.redirect('/admin/certifications');
  }
};

/**
 * Get single exam
 */
exports.getExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    const exam = await Exam.findById(id)
      .populate('certificationId', 'name code')
      .populate('createdBy', 'username');
      
    if (!exam) {
      req.flash('error_msg', 'Exam not found');
      return res.redirect('/admin/exams');
    }
    
    res.render('admin/exam', {
      title: exam.name,
      exam
    });
  } catch (err) {
    console.error('Error loading exam:', err);
    req.flash('error_msg', 'Failed to load exam');
    res.redirect('/admin/exams');
  }
};

/**
 * Get single question
 */
exports.getQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id)
      .populate('certificationId', 'name code');
      
    if (!question) {
      req.flash('error_msg', 'Question not found');
      return res.redirect('/admin/questions');
    }
    
    res.render('admin/question', {
      title: 'Question Details',
      question
    });
  } catch (err) {
    console.error('Error loading question:', err);
    req.flash('error_msg', 'Failed to load question');
    res.redirect('/admin/questions');
  }
};


/**
 * Render certification management page
 */
exports.getCertifications = async (req, res) => {
  try {
    const certifications = await Certification.find()
      .sort({ createdAt: -1 });
    
    // Get stats for each certification
    const certStats = await Promise.all(
      certifications.map(async cert => {
        const examCount = await Exam.countDocuments({ 
          certificationId: cert._id 
        });
        
        const questionCount = await Question.countDocuments({ 
          certificationId: cert._id 
        });
        
        const attemptCount = await Attempt.countDocuments({ 
          certificationId: cert._id,
          completed: true
        });
        
        return {
          id: cert._id,
          examCount,
          questionCount,
          attemptCount
        };
      })
    );
    
    res.render('admin/certifications', {
      title: 'Certification Management',
      certifications,
      certStats: certStats.reduce((acc, stat) => {
        acc[stat.id] = stat;
        return acc;
      }, {})
    });
  } catch (err) {
    console.error('Error loading certifications:', err);
    req.flash('error_msg', 'Failed to load certifications');
    res.redirect('/admin');
  }
};

/**
 * Create new certification
 */
exports.createCertification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { name, code, provider, description, passingScore, timeLimit, domains } = req.body;
    
    // Check if certification already exists
    const existingCert = await Certification.findOne({ 
      $or: [
        { name },
        { code }
      ]
    });
    
    if (existingCert) {
      return res.status(400).json({ 
        success: false, 
        message: 'Certification with this name or code already exists' 
      });
    }
    
    // Parse domains from JSON
    let parsedDomains;
    try {
      parsedDomains = typeof domains === 'string' 
        ? JSON.parse(domains) 
        : domains;
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid domains format' 
      });
    }
    
    // Create new certification
    const newCertification = new Certification({
      name,
      code,
      provider,
      description,
      passingScore: parseInt(passingScore),
      timeLimit: parseInt(timeLimit),
      domains: parsedDomains,
      active: true,
      createdBy: req.user._id
    });
    
    await newCertification.save();
    
    return res.json({ 
      success: true, 
      certification: newCertification 
    });
  } catch (err) {
    console.error('Error creating certification:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create certification' 
    });
  }
};

/**
 * Update certification
 */
exports.updateCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, passingScore, timeLimit, domains, active } = req.body;
    
    const certification = await Certification.findById(id);
    if (!certification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certification not found' 
      });
    }
    
    // Parse domains if provided
    let parsedDomains;
    if (domains) {
      try {
        parsedDomains = typeof domains === 'string' 
          ? JSON.parse(domains) 
          : domains;
      } catch (err) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid domains format' 
        });
      }
    }
    
    // Update fields
    if (name) certification.name = name;
    if (description) certification.description = description;
    if (passingScore) certification.passingScore = parseInt(passingScore);
    if (timeLimit) certification.timeLimit = parseInt(timeLimit);
    if (parsedDomains) certification.domains = parsedDomains;
    if (active !== undefined) certification.active = active;
    
    certification.updatedAt = new Date();
    await certification.save();
    
    return res.json({ 
      success: true, 
      certification 
    });
  } catch (err) {
    console.error('Error updating certification:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update certification' 
    });
  }
};

/**
 * Render exam management page
 */
exports.getExams = async (req, res) => {
  try {
    const certificationId = req.query.certification || null;
    
    const query = {};
    if (certificationId) {
      query.certificationId = certificationId;
    }
    
    const exams = await Exam.find(query)
      .populate('certificationId', 'name code')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    const certifications = await Certification.find({ active: true })
      .select('name code');
    
    res.render('admin/exams', {
      title: 'Exam Management',
      exams,
      certifications,
      selectedCertification: certificationId
    });
  } catch (err) {
    console.error('Error loading exams:', err);
    req.flash('error_msg', 'Failed to load exams');
    res.redirect('/admin');
  }
};

/**
 * Create new exam
 */
exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const {
      name,
      certificationId,
      description,
      questionCount,
      timeLimit,
      randomize,
      showResults
    } = req.body;
    
    // Check if certification exists
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certification not found' 
      });
    }
    
    // Check if enough questions exist
    const questionCountInDb = await Question.countDocuments({
      certificationId,
      active: true
    });
    
    if (questionCountInDb < questionCount) {
      return res.status(400).json({
        success: false,
        message: `Not enough questions available. Requested ${questionCount}, but only ${questionCountInDb} exist.`
      });
    }
    
    // Create new exam
    const newExam = new Exam({
      name,
      certificationId,
      description,
      questionCount: parseInt(questionCount),
      timeLimit: timeLimit ? parseInt(timeLimit) : null,
      randomize: randomize === 'true',
      showResults: showResults === 'true',
      active: true,
      createdBy: req.user._id
    });
    
    await newExam.save();
    
    return res.json({ 
      success: true, 
      exam: newExam 
    });
  } catch (err) {
    console.error('Error creating exam:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create exam' 
    });
  }
};

/**
 * Update exam
 */
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      questionCount,
      timeLimit,
      randomize,
      showResults,
      active
    } = req.body;
    
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ 
        success: false, 
        message: 'Exam not found' 
      });
    }
    
    // Check if enough questions exist if count is being updated
    if (questionCount && parseInt(questionCount) !== exam.questionCount) {
      const questionCountInDb = await Question.countDocuments({
        certificationId: exam.certificationId,
        active: true
      });
      
      if (questionCountInDb < parseInt(questionCount)) {
        return res.status(400).json({
          success: false,
          message: `Not enough questions available. Requested ${questionCount}, but only ${questionCountInDb} exist.`
        });
      }
    }
    
    // Update fields
    if (name) exam.name = name;
    if (description) exam.description = description;
    if (questionCount) exam.questionCount = parseInt(questionCount);
    if (timeLimit) exam.timeLimit = parseInt(timeLimit);
    if (randomize !== undefined) exam.randomize = randomize === 'true';
    if (showResults !== undefined) exam.showResults = showResults === 'true';
    if (active !== undefined) exam.active = active === 'true';
    
    exam.updatedAt = new Date();
    await exam.save();
    
    return res.json({ 
      success: true, 
      exam 
    });
  } catch (err) {
    console.error('Error updating exam:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update exam' 
    });
  }
};

/**
 * Delete exam
 */
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam has attempts
    const attemptCount = await Attempt.countDocuments({ examId: id });
    if (attemptCount > 0) {
      // Don't delete, just deactivate
      await Exam.findByIdAndUpdate(id, { active: false });
      return res.json({
        success: true,
        message: 'Exam has existing attempts. It has been deactivated instead of deleted.'
      });
    }
    
    await Exam.findByIdAndDelete(id);
    
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting exam:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to delete exam' 
    });
  }
};

/**
 * Render question management page
 */
exports.getQuestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const certificationId = req.query.certification || null;
    const domain = req.query.domain || null;
    const search = req.query.search || '';
    
    const query = {};
    if (certificationId) {
      query.certificationId = certificationId;
    }
    if (domain) {
      query.domain = domain;
    }
    if (search) {
      query.$or = [
        { text: { $regex: search, $options: 'i' } },
        { explanation: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const totalQuestions = await Question.countDocuments(query);
    const totalPages = Math.ceil(totalQuestions / limit);
    
    const questions = await Question.find(query)
      .populate('certificationId', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const certifications = await Certification.find({ active: true })
      .select('name code domains');
    
    // Get domains if certification is selected
    let domains = [];
    if (certificationId) {
      const selectedCert = certifications.find(
        c => c._id.toString() === certificationId
      );
      if (selectedCert) {
        domains = selectedCert.domains.map(d => d.name);
      }
    }
    
    res.render('admin/questions', {
      title: 'Question Management',
      questions,
      certifications,
      domains,
      pagination: {
        page,
        limit,
        totalPages,
        totalQuestions
      },
      filters: {
        certification: certificationId,
        domain,
        search
      }
    });
  } catch (err) {
    console.error('Error loading questions:', err);
    req.flash('error_msg', 'Failed to load questions');
    res.redirect('/admin');
  }
};

/**
 * Get domains for a certification (AJAX)
 */
exports.getCertificationDomains = async (req, res) => {
  try {
    const { certificationId } = req.params;
    
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certification not found' 
      });
    }
    
    return res.json({
      success: true,
      domains: certification.domains
    });
  } catch (err) {
    console.error('Error getting certification domains:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get domains' 
    });
  }
};

/**
 * Import questions from CSV
 */
exports.importQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    const { certificationId } = req.body;
    
    // Check if certification exists
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certification not found' 
      });
    }
    
    // Read CSV file
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Parse CSV
    const parsedCsv = await new Promise((resolve) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results)
      });
    });
    
    if (parsedCsv.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV parsing errors',
        errors: parsedCsv.errors
      });
    }
    
    // Validate and transform data
    const questions = [];
    const errors = [];
    
    for (let i = 0; i < parsedCsv.data.length; i++) {
      const row = parsedCsv.data[i];
      const rowNumber = i + 2; // +2 for header row and 0-based index
      
      try {
        // Required fields
        if (!row.text || !row.domain || !row.options || !row.correctAnswers) {
          errors.push(`Row ${rowNumber}: Missing required fields`);
          continue;
        }
        
        // Validate domain exists in certification
        const domainExists = certification.domains.some(
          d => d.name === row.domain
        );
        if (!domainExists) {
          errors.push(`Row ${rowNumber}: Domain "${row.domain}" not found in certification`);
          continue;
        }
        
        // Parse options
        let options;
        try {
          options = JSON.parse(row.options);
          if (!Array.isArray(options) || options.length < 2) {
            throw new Error('Options must be an array with at least 2 items');
          }
        } catch (err) {
          errors.push(`Row ${rowNumber}: Invalid options format - ${err.message}`);
          continue;
        }
        
        // Parse correct answers
        let correctAnswers;
        try {
          correctAnswers = JSON.parse(row.correctAnswers);
          if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
            throw new Error('Correct answers must be a non-empty array');
          }
          
          // Validate all correct answers exist in options
          const optionIds = options.map(opt => opt.id);
          const invalidAnswers = correctAnswers.filter(
            ans => !optionIds.includes(ans)
          );
          
          if (invalidAnswers.length > 0) {
            throw new Error(`Correct answers [${invalidAnswers.join(', ')}] not found in options`);
          }
        } catch (err) {
          errors.push(`Row ${rowNumber}: Invalid correct answers format - ${err.message}`);
          continue;
        }
        
        // Parse tags
        let tags = [];
        if (row.tags) {
          try {
            tags = JSON.parse(row.tags);
            if (!Array.isArray(tags)) {
              throw new Error('Tags must be an array');
            }
          } catch (err) {
            errors.push(`Row ${rowNumber}: Invalid tags format - ${err.message}`);
            continue;
          }
        }
        
        // Create question object
        questions.push({
          certificationId,
          domain: row.domain,
          text: row.text,
          options,
          correctAnswers,
          explanation: row.explanation || '',
          difficulty: parseInt(row.difficulty) || 3,
          tags,
          analytics: {
            timesAnswered: 0,
            timesCorrect: 0,
            avgTimeSpent: 0,
            difficultyRating: 0
          },
          active: true,
          createdBy: req.user._id,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (err) {
        errors.push(`Row ${rowNumber}: Unexpected error - ${err.message}`);
      }
    }
    
    // Remove temporary file
    fs.unlinkSync(req.file.path);
    
    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions found in CSV',
        errors
      });
    }
    
    // Insert questions
    const result = await Question.insertMany(questions);
    
    return res.json({
      success: true,
      message: `Imported ${result.length} questions successfully`,
      total: parsedCsv.data.length,
      imported: result.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Error importing questions:', err);
    
    // Remove temporary file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error removing temporary file:', unlinkErr);
      }
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to import questions' 
    });
  }
};

/**
 * Create or update question
 */
exports.saveQuestion = async (req, res) => {
  try {
    const { id, certificationId, domain, text, options, 
            correctAnswers, explanation, difficulty, tags } = req.body;
    
    // Parse arrays if they're strings
    const parsedOptions = typeof options === 'string' 
      ? JSON.parse(options) 
      : options;
      
    const parsedCorrectAnswers = typeof correctAnswers === 'string'
      ? JSON.parse(correctAnswers)
      : correctAnswers;
      
    const parsedTags = typeof tags === 'string'
      ? JSON.parse(tags)
      : (tags || []);
    
    // Validate certification and domain
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }
    
    const domainExists = certification.domains.some(d => d.name === domain);
    if (!domainExists) {
      return res.status(400).json({
        success: false,
        message: `Domain "${domain}" not found in certification`
      });
    }
    
    // Validate options and correct answers
    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Options must be an array with at least 2 items'
      });
    }
    
    if (!Array.isArray(parsedCorrectAnswers) || parsedCorrectAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Correct answers must be a non-empty array'
      });
    }
    
    const optionIds = parsedOptions.map(opt => opt.id);
    const invalidAnswers = parsedCorrectAnswers.filter(
      ans => !optionIds.includes(ans)
    );
    
    if (invalidAnswers.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Correct answers [${invalidAnswers.join(', ')}] not found in options`
      });
    }
    
    // Create or update question
    let question;
    
    if (id) {
      // Update existing question
      question = await Question.findById(id);
      
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found'
        });
      }
      
      // Update fields
      question.domain = domain;
      question.text = text;
      question.options = parsedOptions;
      question.correctAnswers = parsedCorrectAnswers;
      question.explanation = explanation;
      question.difficulty = parseInt(difficulty);
      question.tags = parsedTags;
      question.updatedAt = new Date();
      
      await question.save();
    } else {
      // Create new question
      question = new Question({
        certificationId,
        domain,
        text,
        options: parsedOptions,
        correctAnswers: parsedCorrectAnswers,
        explanation,
        difficulty: parseInt(difficulty),
        tags: parsedTags,
        analytics: {
          timesAnswered: 0,
          timesCorrect: 0,
          avgTimeSpent: 0,
          difficultyRating: 0
        },
        active: true,
        createdBy: req.user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await question.save();
    }
    
    return res.json({
      success: true,
      message: id ? 'Question updated successfully' : 'Question created successfully',
      question
    });
  } catch (err) {
    console.error('Error saving question:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save question'
    });
  }
};

/**
 * Delete question
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Check if question has been used in attempts
    const isUsed = question.analytics.timesAnswered > 0;
    
    if (isUsed) {
      // Instead of deleting, mark as inactive
      question.active = false;
      question.updatedAt = new Date();
      await question.save();
      
      return res.json({
        success: true,
        message: 'Question has been used in attempts. It has been deactivated instead of deleted.',
        deactivated: true
      });
    } else {
      // Delete completely
      await Question.findByIdAndDelete(id);
      
      return res.json({
        success: true,
        message: 'Question deleted successfully',
        deactivated: false
      });
    }
  } catch (err) {
    console.error('Error deleting question:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
};

/**
 * Get question statistics
 */
exports.getQuestionStats = async (req, res) => {
  try {
    const { id } = req.params;
    
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }
    
    // Get all attempts that include this question
    const attempts = await Attempt.find({
      'questions.questionId': mongoose.Types.ObjectId(id),
      completed: true
    }).select('questions');
    
    // Filter to just this question's data
    const questionData = attempts
      .map(attempt => attempt.questions.find(
        q => q.questionId.toString() === id
      ))
      .filter(Boolean);
    
    // Calculate statistics
    const stats = {
      totalAttempts: questionData.length,
      correctCount: questionData.filter(q => q.correct).length,
      correctPercentage: questionData.length > 0
        ? (questionData.filter(q => q.correct).length / questionData.length) * 100
        : 0,
      avgTimeSpent: questionData.length > 0
        ? questionData.reduce((sum, q) => sum + q.timeSpent, 0) / questionData.length
        : 0,
      timeDistribution: {
        under30s: questionData.filter(q => q.timeSpent < 30).length,
        under60s: questionData.filter(q => q.timeSpent >= 30 && q.timeSpent < 60).length,
        under120s: questionData.filter(q => q.timeSpent >= 60 && q.timeSpent < 120).length,
        over120s: questionData.filter(q => q.timeSpent >= 120).length
      },
      // Calculate option distribution
      optionDistribution: question.options.map(option => {
        return {
          id: option.id,
          text: option.text,
          count: questionData.filter(q => q.userAnswers.includes(option.id)).length,
          percentage: questionData.length > 0
            ? (questionData.filter(q => q.userAnswers.includes(option.id)).length / questionData.length) * 100
            : 0
        };
      })
    };
    
    return res.json({
      success: true,
      stats,
      question: {
        id: question._id,
        text: question.text,
        domain: question.domain,
        difficulty: question.difficulty,
        tags: question.tags
      }
    });
  } catch (err) {
    console.error('Error getting question stats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get question statistics'
    });
  }
};

/**
 * Export questions to CSV
 */
exports.exportQuestions = async (req, res) => {
  try {
    const { certificationId, domain } = req.query;
    
    const query = {};
    if (certificationId) {
      query.certificationId = certificationId;
    }
    if (domain) {
      query.domain = domain;
    }
    
    const questions = await Question.find(query)
      .populate('certificationId', 'name code');
    
    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found with the specified criteria'
      });
    }
    
    // Format questions for CSV export
    const csvData = questions.map(q => ({
      id: q._id.toString(),
      certification: q.certificationId.name,
      certificationCode: q.certificationId.code,
      domain: q.domain,
      text: q.text,
      options: JSON.stringify(q.options),
      correctAnswers: JSON.stringify(q.correctAnswers),
      explanation: q.explanation,
      difficulty: q.difficulty,
      tags: JSON.stringify(q.tags),
      timesAnswered: q.analytics.timesAnswered,
      correctPercentage: q.analytics.timesAnswered > 0
        ? (q.analytics.timesCorrect / q.analytics.timesAnswered) * 100
        : 0,
      avgTimeSpent: q.analytics.avgTimeSpent,
      active: q.active ? 'Yes' : 'No',
      createdAt: q.createdAt.toISOString()
    }));
    
    // Generate CSV
    const csv = Papa.unparse(csvData);
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=questions-export.csv');
    
    return res.send(csv);
  } catch (err) {
    console.error('Error exporting questions:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to export questions'
    });
  }
};

/**
 * Get analytics dashboard
 */
// exports.getAnalytics = async (req, res) => {
//   try {
//     // Get time range from query params
//     const range = req.query.range || 'month';
//     let startDate;
    
//     switch (range) {
//       case 'week':
//         startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//         break;
//       case 'month':
//         startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//         break;
//       case 'quarter':
//         startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
//         break;
//       case 'year':
//         startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
//         break;
//       default:
//         startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     }
    
//     // Get aggregated analytics
//     const analytics = await analyticsService.getAdminAnalytics(startDate);
    
//     res.render('admin/analytics', {
//       title: 'Analytics Dashboard',
//       analytics,
//       range
//     });
//   } catch (err) {
//     console.error('Error loading analytics dashboard:', err);
//     req.flash('error_msg', 'Failed to load analytics');
//     res.redirect('/admin');
//   }
// };

/**
 * Get certification analytics
 */
// exports.getCertificationAnalytics = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const range = req.query.range || 'month';
    
//     // Validate certification
//     const certification = await Certification.findById(id);
//     if (!certification) {
//       return res.status(404).json({
//         success: false,
//         message: 'Certification not found'
//       });
//     }
    
//     // Determine date range
//     let startDate;
//     switch (range) {
//       case 'week':
//         startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//         break;
//       case 'month':
//         startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//         break;
//       case 'quarter':
//         startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
//         break;
//       case 'year':
//         startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
//         break;
//       case 'all':
//         startDate = new Date(0); // Beginning of time
//         break;
//       default:
//         startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
//     }
    
//     // Get analytics for this certification
//     const analytics = await analyticsService.getCertificationAnalytics(id, startDate);
    
//     return res.json({
//       success: true,
//       certification: {
//         id: certification._id,
//         name: certification.name,
//         code: certification.code
//       },
//       analytics
//     });
//   } catch (err) {
//     console.error('Error getting certification analytics:', err);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to get certification analytics'
//     });
//   }
// };








