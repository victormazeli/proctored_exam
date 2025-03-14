// controllers/adminController.js
const User = require('../models/user');
const Question = require('../models/question');
const Exam = require('../models/exam');
const Certification = require('../models/certification');
const Attempt = require('../models/attempt');
// const analyticsService = require('../services/analyticsService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
 * Create User
 */
exports.createUser = async (req, res) => {
  // Ensure the requester is an admin
  // if (!req.user || req.user.role !== 'admin') {
  //   return res.status(403).json({
  //     success: false,
  //     message: 'Unauthorized access'
  //   });
  // }


  const { username, email, password, name, role} = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role,
      profile: {
        name: name || username,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=0D8ABC&color=fff`
      },
      settings: {
        proctorEnabled: true,
        notificationsEnabled: true
      },
      metrics: {
        totalAttempts: 0,
        examsPassed: 0,
        averageScore: 0,
        totalTimeSpent: 0
      }
    });

    await newUser.save();

    // Log user creation
    // console.log(`New admin created by ${req.user.username}: ${username} at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('User creation error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user creation'
    });
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
    // query._id = { $ne: req.user._id };
    
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);
    
    const users = await User.find(query)
      .select('username email role profile.name, profile.avatar createdAt metrics')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return res.status(200).json({
      success: true,
      data: {
      users,
      pagination: {
        page,
        limit,
        totalPages,
        totalUsers
      }
      }
    })
  } catch (err) {
    console.error('Error loading users:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load users' 
    });
  }
};

exports.getUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('username email role profile.name, profile.avatar createdAt metrics');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User Not found' 
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    })
    
  } catch (error) {
    console.error('Error loading user:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load user' 
    });
  }
}

/**
 * Update user role
 */
exports.updateUserRole = async (req, res) => {
  try {
    const userId = req.params.userId;

    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    
    // Prevent changing own role
    // if (userId === req.user._id.toString()) {
    //   return res.status(400).json({ 
    //     success: false, 
    //     message: 'Cannot change your own role' 
    //   });
    // }
    
    await User.findByIdAndUpdate(userId, { role });
    
    return res.status(200).json({ success: true, data: null });
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
      return res.status(404).json({ success: false, message: 'Certification not found' });
    }

    return res.status(200).json({
      success: true,
      data: certification
    })
  } catch (err) {
    console.error('Error loading certification:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load certification' 
    });
  }
};


/**
 * Get all domains across all certifications
 * @route GET /api/domains
 */
exports.getAllDomains = async (req, res) => {
  try {
    // Fetch all certifications with their domains
    const certifications = await Certification.find().lean();
    
    // Extract and flatten all domains
    const allDomains = [];
    certifications.forEach(cert => {
      // Add certification info to each domain
      const domainsWithCertInfo = cert.domains.map(domain => ({
        ...domain,
        // certificationId: cert._id,
        // certificationName: cert.name,
        // certificationCode: cert.code
      }));
      
      allDomains.push(...domainsWithCertInfo);
    });
    
    return res.status(200).json({
      success: true,
      data: allDomains
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load domains' 
    });
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'domain.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    
    const totalCerts = await Certification.countDocuments(query);
    const totalPages = Math.ceil(totalCerts / limit);

    const certifications = await Certification.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
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
    
   
    return res.status(200).json({
      success: true,
      data: {
        certifications,
        certStats: certStats.reduce((acc, stat) => {
          acc[stat.id] = stat;
          return acc;
        }, {}),
        pagination: {
          page,
          limit,
          totalPages,
          totalCerts
        }
      }
    })
  } catch (err) {
    console.error('Error loading certifications:', err);
    return res.stats(500).json({
      success: false,
      message: 'Error loading certifications'
    })
  }
};

/**
 * Create new certification
 */
exports.createCertification = async (req, res) => {
  try {
    
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
      // createdBy: req.user._id
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
    let { name, description, passingScore, timeLimit, domains, active } = req.body;

    // Filter out domains with empty names
    if (domains && Array.isArray(domains)) {
      domains = domains.filter(domain => domain.name && domain.name.trim() !== '');
    }
    
    // Parse domains if provided as a string
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
    
    // Build update object with only the fields that were provided
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (passingScore !== undefined) updateFields.passingScore = parseInt(passingScore);
    if (timeLimit !== undefined) updateFields.timeLimit = parseInt(timeLimit);
    if (parsedDomains) updateFields.domains = parsedDomains;
    if (active !== undefined) updateFields.active = active;
    
    // Add updatedAt timestamp
    updateFields.updatedAt = new Date();
    
    // Use findByIdAndUpdate for a single database operation
    const certification = await Certification.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true } // Return updated doc and run schema validators
    );
    
    if (!certification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certification not found' 
      });
    }
    
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


    return res.status(200).json({
      success: true,
      exams,
      certifications,
      selectedCertification: certificationId
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
 * Create new exam
 */
exports.createExam = async (req, res) => {
  try {
    
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
      // createdBy: req.user._id
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

    return res.status(200).json({
      status: true,
      data: {
        questions,
        certifications,
        domains,
        pagination: {
          page,
          limit,
          totalPages,
          totalQuestions
        },
      }
    })
  } catch (err) {
    console.error('Error loading questions:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to load questions' 
    });
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
      data: certification.domains
    });
  } catch (err) {
    console.error('Error getting certification domains:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get domains' 
    });
  }
};


// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');  // Make sure this directory exists
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept only CSV files
  if (file.mimetype === 'text/csv') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB max file size
  }
});

// Middleware handler for file upload
exports.uploadQuestionsCsv = upload.single('file');

// Handle validation errors from multer
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

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
          // createdBy: req.user._id,
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








