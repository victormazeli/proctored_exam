// controllers/tutorialController.js
const Tutorial = require('../models/tutorial');
const Lesson = require('../models/lesson');
const UserProgress = require('../models/userProgress');
const tutorialService = require('../services/tutorialService');
const Certification = require('../models/certification');

/**
 * Get all tutorials page
 */
exports.getTutorials = async (req, res) => {
  try {
    const certificationId = req.query.certification || null;
    
    // Get all tutorials or filter by certification
    const tutorials = await tutorialService.getTutorials(certificationId);
    
    // Get all certifications for filter dropdown
    const certifications = await Certification.find({ active: true })
      .select('name code')
      .sort({ name: 1 });
    
    // If user is logged in, get progress
    const userId = req.user ? req.user._id : null;
    let tutorialsWithProgress = tutorials;
    
    if (userId) {
      tutorialsWithProgress = await tutorialService.getUserTutorialProgress(userId, certificationId);
    }
    
    return res.status(200).json({
      success: true,
      data: {
        tutorials: tutorialsWithProgress,
        certifications,
        selectedCertification: certificationId
      }
    });
  } catch (err) {
    console.error('Error loading tutorials:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load tutorials'
    });
  }
};

/**
 * Get tutorial details with lessons
 */
exports.getTutorialDetails = async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    // Get tutorial with lessons
    const tutorial = await tutorialService.getTutorialWithLessons(tutorialId);
    
    // If user is logged in, get progress for each lesson
    const userId = req.user ? req.user._id : null;
    let lessonsWithProgress = tutorial.lessons;
    
    if (userId) {
      // Get progress for all lessons in this tutorial
      const lessonIds = tutorial.lessons.map(l => l._id);
      const progressEntries = await UserProgress.find({
        userId,
        lessonId: { $in: lessonIds }
      });
      
      // Merge progress into lessons
      lessonsWithProgress = tutorial.lessons.map(lesson => {
        const progress = progressEntries.find(p => p.lessonId.toString() === lesson._id.toString());
        
        return {
          ...lesson,
          progress: progress ? {
            status: progress.status,
            completionPercentage: progress.completionPercentage,
            lastAccessedAt: progress.lastAccessedAt
          } : {
            status: 'not_started',
            completionPercentage: 0,
            lastAccessedAt: null
          }
        };
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        ...tutorial,
        lessons: lessonsWithProgress
      }
    });
  } catch (err) {
    console.error('Error loading tutorial details:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load tutorial details'
    });
  }
};

/**
 * Get lesson details
 */
exports.getLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    // Get lesson with navigation
    const lessonData = await tutorialService.getLesson(lessonId);
    
    // If user is logged in, get progress
    const userId = req.user ? req.user._id : null;
    let progress = null;
    
    if (userId) {
      progress = await UserProgress.findOne({
        userId,
        lessonId
      });
      
      // If no progress exists yet, create it
      if (!progress) {
        progress = new UserProgress({
          userId,
          lessonId,
          tutorialId: lessonData.lesson.tutorialId,
          status: 'not_started',
          completionPercentage: 0
        });
        await progress.save();
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        ...lessonData,
        progress: progress ? {
          status: progress.status,
          completionPercentage: progress.completionPercentage,
          lastAccessedAt: progress.lastAccessedAt
        } : null
      }
    });
  } catch (err) {
    console.error('Error loading lesson:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load lesson'
    });
  }
};

/**
 * Track lesson progress
 */
exports.trackProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { completionPercentage, timeSpent } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Track progress
    const progress = await tutorialService.trackLessonProgress(
      req.user._id,
      lessonId,
      completionPercentage,
      timeSpent
    );
    
    return res.status(200).json({
      success: true,
      data: {
        status: progress.status,
        completionPercentage: progress.completionPercentage,
        lastAccessedAt: progress.lastAccessedAt
      }
    });
  } catch (err) {
    console.error('Error tracking lesson progress:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to track progress'
    });
  }
};

/**
 * Get user progress dashboard
 */
exports.getUserProgress = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get overall progress for all certifications
    const certifications = await Certification.find({ active: true });
    const progressByCategory = [];
    
    for (const certification of certifications) {
      // Get tutorials for this certification with progress
      const tutorials = await tutorialService.getUserTutorialProgress(
        req.user._id,
        certification._id
      );
      
      // Calculate overall progress
      let totalLessons = 0;
      let completedLessons = 0;
      
      tutorials.forEach(tutorial => {
        totalLessons += tutorial.progress.totalLessons;
        completedLessons += tutorial.progress.lessonsCompleted;
      });
      
      const completionPercentage = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;
      
      progressByCategory.push({
        certification: {
          _id: certification._id,
          name: certification.name,
          code: certification.code
        },
        tutorials: tutorials.length,
        progress: {
          completionPercentage,
          completedLessons,
          totalLessons
        }
      });
    }
    
    // Get recent activity
    const recentProgress = await UserProgress.find({
      userId: req.user._id
    })
    .sort({ lastAccessedAt: -1 })
    .limit(5)
    .populate({
      path: 'lessonId',
      select: 'title',
      populate: {
        path: 'tutorialId',
        select: 'title',
        populate: {
          path: 'certificationId',
          select: 'name code'
        }
      }
    });
    
    // Get recommendations
    const recommendations = await tutorialService.getUserRecommendations(
      req.user._id,
      5 // Limit to 5 recommendations
    );
    
    return res.status(200).json({
      success: true,
      data: {
        progressByCategory,
        recentActivity: recentProgress.map(progress => ({
          lessonId: progress.lessonId._id,
          lessonTitle: progress.lessonId.title,
          tutorialId: progress.lessonId.tutorialId._id,
          tutorialTitle: progress.lessonId.tutorialId.title,
          certificationName: progress.lessonId.tutorialId.certificationId.name,
          status: progress.status,
          completionPercentage: progress.completionPercentage,
          lastAccessedAt: progress.lastAccessedAt
        })),
        recommendations: recommendations.map(rec => ({
          _id: rec._id,
          tutorialId: rec.tutorialId._id,
          tutorialTitle: rec.tutorialId.title,
          lessonId: rec.lessonId._id,
          lessonTitle: rec.lessonId.title,
          certificationName: rec.tutorialId.certificationId.name,
          domain: rec.domain,
          examScore: rec.examAttemptId.score.overall,
          priority: rec.priority
        }))
      }
    });
  } catch (err) {
    console.error('Error getting user progress:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to get progress data'
    });
  }
};

/**
 * Mark recommendation as viewed
 */
exports.markRecommendationViewed = async (req, res) => {
  try {
    const { recommendationId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Mark recommendation as viewed
    await tutorialService.markRecommendationViewed(recommendationId);
    
    return res.status(200).json({
      success: true,
      message: 'Recommendation marked as viewed'
    });
  } catch (err) {
    console.error('Error marking recommendation as viewed:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update recommendation'
    });
  }
};

/**
 * Generate recommendations after an exam attempt
 */
exports.generateRecommendationsAfterExam = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Generate recommendations
    const recommendations = await tutorialService.generateRecommendations(
      req.user._id,
      attemptId
    );
    
    return res.status(200).json({
      success: true,
      data: {
        recommendationsCount: recommendations.length
      }
    });
  } catch (err) {
    console.error('Error generating recommendations:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations'
    });
  }
};



/**
 * Get practical exercises for a lesson
 */
exports.getLessonExercises = async (req, res) => {
    try {
      const { lessonId } = req.params;
      
      // Get exercises
      const exercises = await tutorialService.getLessonPracticalExercises(lessonId);
      
      // If user is logged in, get completion status
      let completionStatus = [];
      if (req.user) {
        completionStatus = await tutorialService.getExerciseCompletionStatus(
          req.user._id,
          lessonId
        );
      }
      
      return res.status(200).json({
        success: true,
        data: {
          exercises,
          completionStatus
        }
      });
    } catch (err) {
      console.error('Error loading practical exercises:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load practical exercises'
      });
    }
  };
  
  /**
   * Track exercise completion
   */
  exports.trackExerciseCompletion = async (req, res) => {
    try {
      const { lessonId, exerciseIndex } = req.params;
      const completionData = req.body;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Validate input
      if (!exerciseIndex || isNaN(parseInt(exerciseIndex))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid exercise index'
        });
      }
      
      // Track completion
      const progress = await tutorialService.trackExerciseCompletion(
        req.user._id,
        lessonId,
        parseInt(exerciseIndex),
        completionData
      );
      
      return res.status(200).json({
        success: true,
        data: {
          lessonProgress: {
            completionPercentage: progress.completionPercentage,
            status: progress.status
          },
          exercisesCompleted: progress.exercisesCompleted
        }
      });
    } catch (err) {
      console.error('Error tracking exercise completion:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to track exercise completion'
      });
    }
  };
  
  // When getting a lesson, we'll also need to add the practical exercises to the response
  // Update the getLesson function to include the exercises and completion status
  exports.getLesson = async (req, res) => {
    try {
      const { lessonId } = req.params;
      
      // Get lesson with navigation
      const lessonData = await tutorialService.getLesson(lessonId);
      
      // If user is logged in, get progress
      const userId = req.user ? req.user._id : null;
      let progress = null;
      let exerciseCompletionStatus = [];
      
      if (userId) {
        progress = await UserProgress.findOne({
          userId,
          lessonId
        });
        
        // If no progress exists yet, create it
        if (!progress) {
          progress = new UserProgress({
            userId,
            lessonId,
            tutorialId: lessonData.lesson.tutorialId,
            status: 'not_started',
            completionPercentage: 0
          });
          await progress.save();
        }
        
        // Get exercise completion status
        exerciseCompletionStatus = await tutorialService.getExerciseCompletionStatus(
          userId,
          lessonId
        );
      }
      
      return res.status(200).json({
        success: true,
        data: {
          ...lessonData,
          progress: progress ? {
            status: progress.status,
            completionPercentage: progress.completionPercentage,
            lastAccessedAt: progress.lastAccessedAt
          } : null,
          exerciseCompletionStatus
        }
      });
    } catch (err) {
      console.error('Error loading lesson:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load lesson'
      });
    }
  };