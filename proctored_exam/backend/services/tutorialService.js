const Tutorial = require('../models/tutorial');
const Lesson = require('../models/lesson');
const UserProgress = require('../models/userProgress');
const TutorialRecommendation = require('../models/tutorialRecommendation');
const Attempt = require('../models/attempt');
const User = require('../models/user');
const Certification = require('../models/certification');
const mongoose = require('mongoose');

/**
 * Get all tutorials (optionally filtered by certification)
 * @param {string} certificationId - Optional certification ID to filter by
 * @returns {Promise<Array>} - Array of tutorials
 */
exports.getTutorials = async (certificationId = null) => {
  try {
    const query = { active: true };
    
    if (certificationId) {
      query.certificationId = certificationId;
    }
    
    const tutorials = await Tutorial.find(query)
      .populate('certificationId', 'name code')
      .sort({ order: 1 })
      .lean();
      
    return tutorials;
  } catch (error) {
    console.error('Error getting tutorials:', error);
    throw error;
  }
};

/**
 * Get a tutorial by ID with its lessons
 * @param {string} tutorialId - Tutorial ID
 * @returns {Promise<Object>} - Tutorial with lessons
 */
exports.getTutorialWithLessons = async (tutorialId) => {
  try {
    const tutorial = await Tutorial.findById(tutorialId)
      .populate('certificationId', 'name code domains')
      .lean();
      
    if (!tutorial) {
      throw new Error('Tutorial not found');
    }
    
    // Get lessons for this tutorial
    const lessons = await Lesson.find({
      tutorialId,
      active: true
    }).sort({ order: 1 }).lean();
    
    return {
      ...tutorial,
      lessons
    };
  } catch (error) {
    console.error('Error getting tutorial with lessons:', error);
    throw error;
  }
};

/**
 * Get a lesson by ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} - Lesson details
 */
exports.getLesson = async (lessonId) => {
  try {
    const lesson = await Lesson.findById(lessonId).lean();
    
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    
    // Get the tutorial this lesson belongs to
    const tutorial = await Tutorial.findById(lesson.tutorialId)
      .populate('certificationId', 'name code domains')
      .lean();
      
    if (!tutorial) {
      throw new Error('Associated tutorial not found');
    }
    
    // Get next and previous lessons (for navigation)
    const adjacentLessons = await Lesson.find({
      tutorialId: lesson.tutorialId,
      active: true
    }).sort({ order: 1 }).select('_id title order').lean();
    
    const currentIndex = adjacentLessons.findIndex(l => l._id.toString() === lessonId);
    const previousLesson = currentIndex > 0 ? adjacentLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < adjacentLessons.length - 1 ? adjacentLessons[currentIndex + 1] : null;
    
    return {
      lesson,
      tutorial,
      navigation: {
        previousLesson,
        nextLesson,
        totalLessons: adjacentLessons.length,
        currentIndex: currentIndex + 1 // 1-based for display
      }
    };
  } catch (error) {
    console.error('Error getting lesson:', error);
    throw error;
  }
};

/**
 * Track user progress for a lesson
 * @param {string} userId - User ID
 * @param {string} lessonId - Lesson ID
 * @param {number} completionPercentage - Percentage completed (0-100)
 * @param {number} timeSpent - Time spent in seconds
 * @returns {Promise<Object>} - Updated progress
 */
exports.trackLessonProgress = async (userId, lessonId, completionPercentage, timeSpent) => {
  try {
    // Get the lesson to get the tutorial ID
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    
    // Find or create progress record
    let progress = await UserProgress.findOne({
      userId,
      lessonId
    });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        lessonId,
        tutorialId: lesson.tutorialId,
        status: 'not_started',
        completionPercentage: 0,
        timeSpent: 0
      });
    }
    
    // Update progress
    progress.completionPercentage = Math.max(progress.completionPercentage, completionPercentage);
    progress.timeSpent += timeSpent;
    progress.lastAccessedAt = new Date();
    
    // Update status based on completion
    if (completionPercentage >= 100) {
      progress.status = 'completed';
      
      // If this is the first time completing, update user metrics
      if (progress.status !== 'completed') {
        await User.findByIdAndUpdate(userId, {
          $inc: { 'metrics.lessonsCompleted': 1, 'metrics.tutorialTimeSpent': timeSpent }
        });
        
        // Check if all lessons in tutorial are completed
        await checkTutorialCompletion(userId, lesson.tutorialId);
      }
    } else if (completionPercentage > 0) {
      progress.status = 'in_progress';
      
      // Update user metrics for time spent
      await User.findByIdAndUpdate(userId, {
        $inc: { 'metrics.tutorialTimeSpent': timeSpent }
      });
    }
    
    await progress.save();
    
    return progress;
  } catch (error) {
    console.error('Error tracking lesson progress:', error);
    throw error;
  }
};

/**
 * Check if a tutorial is completed by a user
 * @param {string} userId - User ID
 * @param {string} tutorialId - Tutorial ID
 * @returns {Promise<boolean>} - True if all lessons are completed
 */
async function checkTutorialCompletion(userId, tutorialId) {
  try {
    // Get all lessons for this tutorial
    const lessons = await Lesson.find({
      tutorialId,
      active: true
    });
    
    if (lessons.length === 0) {
      return false;
    }
    
    // Get progress for all lessons
    const lessonIds = lessons.map(l => l._id);
    const progress = await UserProgress.find({
      userId,
      lessonId: { $in: lessonIds }
    });
    
    // Check if all lessons are completed
    const allCompleted = lessons.every(lesson => 
      progress.some(p => 
        p.lessonId.toString() === lesson._id.toString() && 
        p.status === 'completed'
      )
    );
    
    if (allCompleted) {
      // Update user metrics for completed tutorial
      await User.findByIdAndUpdate(userId, {
        $inc: { 'metrics.tutorialsCompleted': 1 }
      });
      
      // Get the certification ID from the tutorial
      const tutorial = await Tutorial.findById(tutorialId);
      if (tutorial && tutorial.certificationId) {
        // Update certification progress
        const userCertProgress = await User.findOne(
          { _id: userId, 'certificationProgress.certificationId': tutorial.certificationId },
          { 'certificationProgress.$': 1 }
        );
        
        if (userCertProgress && userCertProgress.certificationProgress.length > 0) {
          // Calculate tutorial progress based on completed tutorials for this certification
          const allCertTutorials = await Tutorial.find({
            certificationId: tutorial.certificationId,
            active: true
          });
          
          const completedTutorialsCount = await getTutorialCompletionCount(userId, tutorial.certificationId);
          const tutorialProgress = (completedTutorialsCount / allCertTutorials.length) * 100;
          
          // Update the certification progress
          await User.updateOne(
            { 
              _id: userId, 
              'certificationProgress.certificationId': tutorial.certificationId 
            },
            { 
              $set: { 'certificationProgress.$.tutorialProgress': tutorialProgress }
            }
          );
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking tutorial completion:', error);
    throw error;
  }
}

/**
 * Get the number of completed tutorials for a certification
 * @param {string} userId - User ID
 * @param {string} certificationId - Certification ID
 * @returns {Promise<number>} - Number of completed tutorials
 */
async function getTutorialCompletionCount(userId, certificationId) {
  try {
    // Get all tutorials for this certification
    const tutorials = await Tutorial.find({
      certificationId,
      active: true
    });
    
    let completedCount = 0;
    
    // Check each tutorial
    for (const tutorial of tutorials) {
      const lessons = await Lesson.find({
        tutorialId: tutorial._id,
        active: true
      });
      
      if (lessons.length === 0) continue;
      
      const lessonIds = lessons.map(l => l._id);
      const progress = await UserProgress.find({
        userId,
        lessonId: { $in: lessonIds }
      });
      
      const allLessonsCompleted = lessons.every(lesson => 
        progress.some(p => 
          p.lessonId.toString() === lesson._id.toString() && 
          p.status === 'completed'
        )
      );
      
      if (allLessonsCompleted) {
        completedCount++;
      }
    }
    
    return completedCount;
  } catch (error) {
    console.error('Error getting tutorial completion count:', error);
    throw error;
  }
}

/**
 * Get user progress for tutorials
 * @param {string} userId - User ID
 * @param {string} certificationId - Optional certification ID to filter by
 * @returns {Promise<Object>} - Progress for each tutorial
 */
exports.getUserTutorialProgress = async (userId, certificationId = null) => {
  try {
    // Build query for tutorials
    const tutorialQuery = { active: true };
    if (certificationId) {
      tutorialQuery.certificationId = certificationId;
    }
    
    // Get all tutorials
    const tutorials = await Tutorial.find(tutorialQuery)
      .populate('certificationId', 'name code')
      .sort({ order: 1 })
      .lean();
    
    // Get all lessons for these tutorials
    const tutorialIds = tutorials.map(t => t._id);
    const lessons = await Lesson.find({
      tutorialId: { $in: tutorialIds },
      active: true
    }).lean();
    
    // Get user progress for these lessons
    const lessonIds = lessons.map(l => l._id);
    const userProgress = await UserProgress.find({
      userId,
      lessonId: { $in: lessonIds }
    }).lean();
    
    // Calculate progress for each tutorial
    const result = tutorials.map(tutorial => {
      const tutorialLessons = lessons.filter(l => l.tutorialId.toString() === tutorial._id.toString());
      
      if (tutorialLessons.length === 0) {
        return {
          ...tutorial,
          progress: {
            status: 'not_started',
            completionPercentage: 0,
            lessonsCompleted: 0,
            totalLessons: 0
          }
        };
      }
      
      // Count completed and in-progress lessons
      let completedCount = 0;
      let inProgressCount = 0;
      let totalCompletionPercentage = 0;
      
      tutorialLessons.forEach(lesson => {
        const progress = userProgress.find(p => p.lessonId.toString() === lesson._id.toString());
        
        if (progress) {
          if (progress.status === 'completed') {
            completedCount++;
            totalCompletionPercentage += 100;
          } else if (progress.status === 'in_progress') {
            inProgressCount++;
            totalCompletionPercentage += progress.completionPercentage;
          }
        }
      });
      
      // Calculate overall progress
      const overallCompletionPercentage = Math.round(totalCompletionPercentage / tutorialLessons.length);
      
      let status = 'not_started';
      if (completedCount === tutorialLessons.length) {
        status = 'completed';
      } else if (completedCount > 0 || inProgressCount > 0) {
        status = 'in_progress';
      }
      
      return {
        ...tutorial,
        progress: {
          status,
          completionPercentage: overallCompletionPercentage,
          lessonsCompleted: completedCount,
          totalLessons: tutorialLessons.length
        }
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error getting user tutorial progress:', error);
    throw error;
  }
};

/**
 * Generate tutorial recommendations based on exam performance
 * @param {string} userId - User ID
 * @param {string} attemptId - Exam attempt ID
 * @returns {Promise<Array>} - Array of recommendations
 */
exports.generateRecommendations = async (userId, attemptId) => {
  try {
    // Get the attempt
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      throw new Error('Attempt not found');
    }
    
    // Get domain scores from the attempt
    if (!attempt.score || !attempt.score.byDomain) {
      throw new Error('Attempt has no domain scores');
    }
    
    // Filter to weak domains (below 70%)
    const weakDomains = attempt.score.byDomain
      .filter(domain => domain.score < 70)
      .sort((a, b) => a.score - b.score); // Sort by score ascending (worst first)
    
    if (weakDomains.length === 0) {
      return []; // No weak domains, no recommendations needed
    }
    
    // Create recommendations array
    const recommendations = [];
    
    // Process each weak domain
    for (const domainScore of weakDomains) {
      const domain = domainScore.domain;
      
      // Find lessons relevant to this domain
      const relevantLessons = await Lesson.find({
        'domainMappings.domainId': domain,
        active: true
      })
      .sort({ 'domainMappings.relevanceScore': -1 })
      .limit(3)
      .lean();
      
      // Add recommendations for each relevant lesson
      for (const lesson of relevantLessons) {
        // Get user progress for this lesson
        const progress = await UserProgress.findOne({
          userId,
          lessonId: lesson._id
        });
        
        // Only recommend if not completed or no progress
        if (!progress || progress.status !== 'completed') {
          // Get the mapping for this domain to get relevance score
          const domainMapping = lesson.domainMappings.find(dm => dm.domainId === domain);
          const relevanceScore = domainMapping ? domainMapping.relevanceScore : 50;
          
          // Calculate priority based on domain score and relevance
          // Lower domain score and higher relevance = higher priority
          const priority = Math.round((100 - domainScore.score) * (relevanceScore / 100));
          
          // Create recommendation
          const recommendation = new TutorialRecommendation({
            userId,
            examAttemptId: attemptId,
            tutorialId: lesson.tutorialId,
            lessonId: lesson._id,
            domain,
            priority
          });
          
          await recommendation.save();
          recommendations.push(recommendation);
        }
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
};

/**
 * Get tutorial recommendations for a user
 * @param {string} userId - User ID
 * @param {number} limit - Max number of recommendations to return
 * @returns {Promise<Array>} - Array of recommendations
 */
exports.getUserRecommendations = async (userId, limit = 5) => {
  try {
    const recommendations = await TutorialRecommendation.find({
      userId,
      viewed: false
    })
    .sort({ priority: -1 })
    .limit(limit)
    .populate({
      path: 'tutorialId',
      select: 'title description',
      populate: {
        path: 'certificationId',
        select: 'name code'
      }
    })
    .populate('lessonId', 'title')
    .populate('examAttemptId', 'score.overall')
    .lean();
    
    return recommendations;
  } catch (error) {
    console.error('Error getting user recommendations:', error);
    throw error;
  }
};

/**
 * Mark a recommendation as viewed
 * @param {string} recommendationId - Recommendation ID
 * @returns {Promise<Object>} - Updated recommendation
 */
exports.markRecommendationViewed = async (recommendationId) => {
  try {
    const recommendation = await TutorialRecommendation.findByIdAndUpdate(
      recommendationId,
      { viewed: true },
      { new: true }
    );
    
    return recommendation;
  } catch (error) {
    console.error('Error marking recommendation as viewed:', error);
    throw error;
  }
};



/**
 * Get practical exercises for a lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Array>} - Array of practical exercises
 */
exports.getLessonPracticalExercises = async (lessonId) => {
    try {
      const lesson = await Lesson.findById(lessonId)
        .select('practicalExercises')
        .lean();
      
      if (!lesson) {
        throw new Error('Lesson not found');
      }
      
      return lesson.practicalExercises || [];
    } catch (error) {
      console.error('Error getting practical exercises:', error);
      throw error;
    }
  };
  
  /**
   * Track practical exercise completion
   * @param {string} userId - User ID
   * @param {string} lessonId - Lesson ID
   * @param {string} exerciseIndex - Index of the exercise in the array
   * @param {object} completionData - Completion data
   * @returns {Promise<Object>} - Updated progress
   */
  exports.trackExerciseCompletion = async (userId, lessonId, exerciseIndex, completionData) => {
    try {
      // Find or create progress record
      let progress = await UserProgress.findOne({
        userId,
        lessonId
      });
      
      if (!progress) {
        // Get tutorial ID for this lesson
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
          throw new Error('Lesson not found');
        }
        
        progress = new UserProgress({
          userId,
          lessonId,
          tutorialId: lesson.tutorialId,
          status: 'not_started',
          completionPercentage: 0,
          timeSpent: 0,
          exercisesCompleted: []
        });
      }
      
      // Initialize exercises completed array if it doesn't exist
      if (!progress.exercisesCompleted) {
        progress.exercisesCompleted = [];
      }
      
      // Check if this exercise is already completed
      const existingIndex = progress.exercisesCompleted.findIndex(ex => 
        ex.exerciseIndex === exerciseIndex
      );
      
      if (existingIndex >= 0) {
        // Update existing entry
        progress.exercisesCompleted[existingIndex] = {
          ...progress.exercisesCompleted[existingIndex],
          ...completionData,
          completedAt: new Date()
        };
      } else {
        // Add new entry
        progress.exercisesCompleted.push({
          exerciseIndex,
          ...completionData,
          completedAt: new Date()
        });
      }
      
      // Update progress status and percentage
      const lesson = await Lesson.findById(lessonId);
      if (lesson && lesson.practicalExercises) {
        const totalExercises = lesson.practicalExercises.length;
        const completedExercises = progress.exercisesCompleted.length;
        
        // Calculate exercise completion percentage
        const exercisePercentage = totalExercises > 0 
          ? (completedExercises / totalExercises) * 100 
          : 0;
        
        // Calculate overall completion (50% for content, 50% for exercises)
        const contentPercentage = progress.completionPercentage || 0;
        const overallPercentage = Math.round((contentPercentage + exercisePercentage) / 2);
        
        progress.completionPercentage = overallPercentage;
        
        if (overallPercentage >= 100) {
          progress.status = 'completed';
        } else if (overallPercentage > 0) {
          progress.status = 'in_progress';
        }
      }
      
      // Update last accessed time
      progress.lastAccessedAt = new Date();
      
      await progress.save();
      
      return progress;
    } catch (error) {
      console.error('Error tracking exercise completion:', error);
      throw error;
    }
  };
  
  /**
   * Get exercise completion status for a user and lesson
   * @param {string} userId - User ID
   * @param {string} lessonId - Lesson ID
   * @returns {Promise<Array>} - Exercise completion data
   */
  exports.getExerciseCompletionStatus = async (userId, lessonId) => {
    try {
      const progress = await UserProgress.findOne({
        userId,
        lessonId
      }).lean();
      
      if (!progress || !progress.exercisesCompleted) {
        return [];
      }
      
      return progress.exercisesCompleted;
    } catch (error) {
      console.error('Error getting exercise completion status:', error);
      throw error;
    }
  };


exports.checkTutorialHasProgress = async (tutorialId) => {
  try {
    // Check if tutorial exists
    const tutorial = await Tutorial.findById(tutorialId);
    if (!tutorial) {
      throw new Error('Tutorial not found');
    }
    
    // Check if there is any user progress for this tutorial
    const progressCount = await UserProgress.countDocuments({
      tutorialId,
      $or: [
        { status: 'in_progress' },
        { status: 'completed' }
      ]
    });
    
    return progressCount > 0;
  } catch (error) {
    console.error('Error checking tutorial progress:', error);
    throw error;
  }
};