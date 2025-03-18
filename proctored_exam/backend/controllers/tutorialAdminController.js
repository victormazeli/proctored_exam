const Tutorial = require('../models/tutorial');
const Lesson = require('../models/lesson');
const Certification = require('../models/certification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Configure storage for lesson content images
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = 'public/uploads/tutorials';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tutorial-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware for file upload
exports.uploadImage = upload.single('image');

/**
 * Get all tutorials for admin
 */
exports.getTutorials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const certificationId = req.query.certification || null;
    
    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (certificationId) {
      query.certificationId = certificationId;
    }
    
    // Get total count
    const totalCount = await Tutorial.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get tutorials with pagination
    const tutorials = await Tutorial.find(query)
      .populate('certificationId', 'name code')
      .sort({ order: 1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    // Get all certifications for filter
    const certifications = await Certification.find({ active: true })
      .select('name code')
      .sort({ name: 1 });
    
    // Get lesson counts for each tutorial
    const tutorialIds = tutorials.map(t => t._id);
    const lessonCounts = await Lesson.aggregate([
      { $match: { tutorialId: { $in: tutorialIds } } },
      { $group: { _id: '$tutorialId', count: { $sum: 1 } } }
    ]);
    
    // Create a map for easy lookup
    const lessonCountMap = {};
    lessonCounts.forEach(item => {
      lessonCountMap[item._id.toString()] = item.count;
    });
    
    // Add lesson count to each tutorial
    const tutorialsWithCount = tutorials.map(tutorial => ({
      _id: tutorial._id,
      title: tutorial.title,
      description: tutorial.description,
      certification: tutorial.certificationId,
      order: tutorial.order,
      active: tutorial.active,
      createdAt: tutorial.createdAt,
      updatedAt: tutorial.updatedAt,
      lessonCount: lessonCountMap[tutorial._id.toString()] || 0
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        tutorials: tutorialsWithCount,
        certifications,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount
        },
        selectedCertification: certificationId
      }
    });
  } catch (err) {
    console.error('Error getting admin tutorials:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tutorials'
    });
  }
};

/**
 * Get a single tutorial
 */
exports.getTutorial = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tutorial = await Tutorial.findById(id)
      .populate('certificationId', 'name code domains');
    
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: tutorial
    });
  } catch (err) {
    console.error('Error getting tutorial:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tutorial'
    });
  }
};

/**
 * Create a new tutorial
 */
exports.createTutorial = async (req, res) => {
  try {
    const { title, description, certificationId, order } = req.body;
    
    // Check if certification exists
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }
    
    // Create tutorial
    const tutorial = new Tutorial({
      title,
      description,
      certificationId,
      order: parseInt(order) || 0,
      active: true,
      createdBy: req.user._id
    });
    
    await tutorial.save();
    
    return res.status(201).json({
      success: true,
      message: 'Tutorial created successfully',
      data: tutorial
    });
  } catch (err) {
    console.error('Error creating tutorial:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create tutorial'
    });
  }
};

/**
 * Update a tutorial
 */
exports.updateTutorial = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, certificationId, order, active } = req.body;
    
    // Check if tutorial exists
    let tutorial = await Tutorial.findById(id);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Check if certification exists if changing
    if (certificationId && certificationId !== tutorial.certificationId.toString()) {
      const certification = await Certification.findById(certificationId);
      if (!certification) {
        return res.status(404).json({
          success: false,
          message: 'Certification not found'
        });
      }
    }
    
    // Update fields
    if (title) tutorial.title = title;
    if (description) tutorial.description = description;
    if (certificationId) tutorial.certificationId = certificationId;
    if (order !== undefined) tutorial.order = parseInt(order);
    if (active !== undefined) tutorial.active = active === 'true' || active === true;
    
    tutorial.updatedAt = new Date();
    
    await tutorial.save();
    
    return res.status(200).json({
      success: true,
      message: 'Tutorial updated successfully',
      data: tutorial
    });
  } catch (err) {
    console.error('Error updating tutorial:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tutorial'
    });
  }
};

/**
 * Delete a tutorial
 */
exports.deleteTutorial = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(id);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Check if tutorial has lessons
    const lessonCount = await Lesson.countDocuments({ tutorialId: id });
    if (lessonCount > 0) {
      // Don't delete, just deactivate
      tutorial.active = false;
      await tutorial.save();
      
      return res.status(200).json({
        success: true,
        message: 'Tutorial has lessons. It has been deactivated instead of deleted.'
      });
    }
    
    // Delete tutorial
    await Tutorial.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Tutorial deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting tutorial:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tutorial'
    });
  }
};

/**
 * Get lessons for a tutorial
 */
exports.getLessons = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId)
      .populate('certificationId', 'name code domains');
    
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Get lessons
    const lessons = await Lesson.find({ tutorialId })
      .sort({ order: 1 });
    
    return res.status(200).json({
      success: true,
      data: {
        tutorial,
        lessons
      }
    });
  } catch (err) {
    console.error('Error getting lessons:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get lessons'
    });
  }
};

/**
 * Get a single lesson
 */
exports.getLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lesson = await Lesson.findById(id);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }
    
    // Get tutorial
    const tutorial = await Tutorial.findById(lesson.tutorialId)
      .populate('certificationId', 'name code domains');
    
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Associated tutorial not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        lesson,
        tutorial
      }
    });
  } catch (err) {
    console.error('Error getting lesson:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get lesson'
    });
  }
};

/**
 * Create a new lesson
 */
exports.createLesson = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      tutorialId, 
      order, 
      estimatedTime,
      domainMappings
    } = req.body;
    
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Parse domain mappings if provided as string
    let parsedDomainMappings = [];
    if (domainMappings) {
      try {
        parsedDomainMappings = typeof domainMappings === 'string' 
          ? JSON.parse(domainMappings) 
          : domainMappings;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid domain mappings format'
        });
      }
    }
    
    // Create lesson
    const lesson = new Lesson({
      title,
      content,
      tutorialId,
      order: parseInt(order) || 0,
      estimatedTime: parseInt(estimatedTime) || 10,
      domainMappings: parsedDomainMappings,
      active: true,
      createdBy: req.user._id
    });
    
    await lesson.save();
    
    // Add lesson to tutorial's lessons array
    tutorial.lessons.push(lesson._id);
    await tutorial.save();
    
    return res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (err) {
    console.error('Error creating lesson:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to create lesson'
    });
  }
};

/**
 * Update a lesson
 */
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      order, 
      estimatedTime,
      domainMappings,
      active
    } = req.body;
    
    // Check if lesson exists
    let lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }
    
    // Parse domain mappings if provided as string
    let parsedDomainMappings = lesson.domainMappings;
    if (domainMappings) {
      try {
        parsedDomainMappings = typeof domainMappings === 'string' 
          ? JSON.parse(domainMappings) 
          : domainMappings;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid domain mappings format'
        });
      }
    }
    
    // Update fields
    if (title) lesson.title = title;
    if (content) lesson.content = content;
    if (order !== undefined) lesson.order = parseInt(order);
    if (estimatedTime) lesson.estimatedTime = parseInt(estimatedTime);
    if (domainMappings) lesson.domainMappings = parsedDomainMappings;
    if (active !== undefined) lesson.active = active === 'true' || active === true;
    
    lesson.updatedAt = new Date();
    
    await lesson.save();
    
    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (err) {
    console.error('Error updating lesson:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update lesson'
    });
  }
};

/**
 * Delete a lesson
 */
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if lesson exists
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }
    
    // Check if users have progress for this lesson
    const progressCount = await UserProgress.countDocuments({ lessonId: id });
    if (progressCount > 0) {
      // Don't delete, just deactivate
      lesson.active = false;
      await lesson.save();
      
      return res.status(200).json({
        success: true,
        message: 'Lesson has user progress. It has been deactivated instead of deleted.'
      });
    }
    
    // Remove lesson from tutorial
    await Tutorial.updateOne(
      { _id: lesson.tutorialId },
      { $pull: { lessons: id } }
    );
    
    // Delete lesson
    await Lesson.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete lesson'
    });
  }
};

/**
 * Upload an image for a lesson
 */
exports.uploadLessonImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Generate URL for the uploaded file
    const imageUrl = `/uploads/tutorials/${req.file.filename}`;
    
    return res.status(200).json({
      success: true,
      data: {
        url: imageUrl
      }
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

/**
 * Reorder lessons in a tutorial
 */
exports.reorderLessons = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    const { lessonOrder } = req.body;
    
    if (!Array.isArray(lessonOrder)) {
      return res.status(400).json({
        success: false,
        message: 'lessonOrder must be an array'
      });
    }
    
    // Get tutorial
    const tutorial = await Tutorial.findById(tutorialId);
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Update order for each lesson
    const updatePromises = lessonOrder.map((item, index) => {
      return Lesson.updateOne(
        { _id: item.id },
        { order: index }
      );
    });
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({
      success: true,
      message: 'Lessons reordered successfully'
    });
  } catch (err) {
    console.error('Error reordering lessons:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder lessons'
    });
  }
};

/**
 * Reorder tutorials
 */
exports.reorderTutorials = async (req, res) => {
  try {
    const { certificationId } = req.params;
    const { tutorialOrder } = req.body;
    
    if (!Array.isArray(tutorialOrder)) {
      return res.status(400).json({
        success: false,
        message: 'tutorialOrder must be an array'
      });
    }
    
    // Get certification
    const certification = await Certification.findById(certificationId);
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }
    
    // Update order for each tutorial
    const updatePromises = tutorialOrder.map((item, index) => {
      return Tutorial.updateOne(
        { _id: item.id },
        { order: index }
      );
    });
    
    await Promise.all(updatePromises);
    
    return res.status(200).json({
      success: true,
      message: 'Tutorials reordered successfully'
    });
  } catch (err) {
    console.error('Error reordering tutorials:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder tutorials'
    });
  }
};

/**
 * Get tutorial analytics
 */
exports.getTutorialAnalytics = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Get tutorial
    const tutorial = await Tutorial.findById(tutorialId)
      .populate('certificationId', 'name code');
    
    if (!tutorial) {
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }
    
    // Get lessons
    const lessons = await Lesson.find({ 
      tutorialId,
      active: true 
    }).sort({ order: 1 });
    
    // Get user progress data
    const lessonIds = lessons.map(l => l._id);
    
    // Count progress by status for each lesson
    const progressCounts = await UserProgress.aggregate([
      { 
        $match: { 
          lessonId: { $in: lessonIds } 
        }
      },
      {
        $group: {
          _id: {
            lessonId: '$lessonId',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate average time spent
    const timeSpentStats = await UserProgress.aggregate([
      {
        $match: {
          lessonId: { $in: lessonIds },
          timeSpent: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$lessonId',
          avgTimeSpent: { $avg: '$timeSpent' },
          totalUsers: { $sum: 1 }
        }
      }
    ]);
    
    // Organize data for each lesson
    const lessonStats = lessons.map(lesson => {
      // Get counts for this lesson
      const notStartedCount = progressCounts.find(
        p => p._id.lessonId.toString() === lesson._id.toString() && p._id.status === 'not_started'
      )?.count || 0;
      
      const inProgressCount = progressCounts.find(
        p => p._id.lessonId.toString() === lesson._id.toString() && p._id.status === 'in_progress'
      )?.count || 0;
      
      const completedCount = progressCounts.find(
        p => p._id.lessonId.toString() === lesson._id.toString() && p._id.status === 'completed'
      )?.count || 0;
      
      // Get time stats
      const timeStats = timeSpentStats.find(
        t => t._id.toString() === lesson._id.toString()
      );
      
      return {
        _id: lesson._id,
        title: lesson.title,
        order: lesson.order,
        stats: {
          notStarted: notStartedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          totalUsers: notStartedCount + inProgressCount + completedCount,
          completionRate: (notStartedCount + inProgressCount + completedCount) > 0 
            ? (completedCount / (notStartedCount + inProgressCount + completedCount)) * 100
            : 0,
          avgTimeSpentSeconds: timeStats?.avgTimeSpent || 0,
          estimatedTimeMinutes: lesson.estimatedTime,
          timeEfficiencyRatio: timeStats?.avgTimeSpent && lesson.estimatedTime
            ? (timeStats.avgTimeSpent / (lesson.estimatedTime * 60))
            : 0
        }
      };
    });
    
    // Calculate tutorial-level statistics
    const totalUsers = await UserProgress.aggregate([
      {
        $match: {
          tutorialId: mongoose.Types.ObjectId(tutorialId)
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    const totalCompleted = await UserProgress.aggregate([
      {
        $match: {
          tutorialId: mongoose.Types.ObjectId(tutorialId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          completedLessons: { $sum: 1 }
        }
      }
    ]);
    
    // Count users who completed all lessons
    const usersCompletedAll = totalCompleted.filter(user => 
      user.completedLessons === lessons.length
    ).length;
    
    return res.status(200).json({
      success: true,
      data: {
        tutorial: {
          _id: tutorial._id,
          title: tutorial.title,
          certification: tutorial.certificationId
        },
        lessonStats,
        overallStats: {
          totalLessons: lessons.length,
          totalUsers: totalUsers[0]?.total || 0,
          usersCompletedAll,
          completionRate: totalUsers[0]?.total > 0
            ? (usersCompletedAll / totalUsers[0].total) * 100
            : 0
        }
      }
    });
  } catch (err) {
    console.error('Error getting tutorial analytics:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get tutorial analytics'
    });
  }
};


// In tutorialAdminController.js
exports.getTutorialStats = async (req, res) => {
    try {
      // Count total and active tutorials
      const totalTutorials = await Tutorial.countDocuments();
      const activeTutorials = await Tutorial.countDocuments({ active: true });
      
      // Count total lessons
      const totalLessons = await Lesson.countDocuments();
      
      // Count total lessons with exercises
      const lessonsWithExercises = await Lesson.countDocuments({
        'practicalExercises.0': { $exists: true }
      });
      
      // Count total exercises
      const totalExercises = await Lesson.aggregate([
        { $unwind: { path: '$practicalExercises', preserveNullAndEmptyArrays: false } },
        { $count: 'total' }
      ]);
      
      const exerciseCount = totalExercises.length > 0 ? totalExercises[0].total : 0;
      
      return res.status(200).json({
        success: true,
        data: {
          total: totalTutorials,
          active: activeTutorials,
          lessons: totalLessons,
          lessonsWithExercises,
          exercises: exerciseCount
        }
      });
    } catch (err) {
      console.error('Error getting tutorial stats:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to get tutorial statistics'
      });
    }
  };