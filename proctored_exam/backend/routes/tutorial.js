const express = require('express');
const router = express.Router();
const tutorialController = require('../controllers/tutorialController');
const tutorialAdminController = require('../controllers/tutorialAdminController');
const tutorialImportService = require('../services/tutorialImportService');
const tutorialImportController = require('../controllers/tutorialImportController');
const { authorizeRoles } = require ('../middleware/auth');

// Public routes
router.get('/tutorials', tutorialController.getTutorials);
router.get('/tutorials/:tutorialId', tutorialController.getTutorialDetails);
router.get('/lessons/:lessonId', tutorialController.getLesson);
router.get('/lessons/:lessonId/exercises', tutorialController.getLessonExercises);


// User routes (require authentication)
router.post('/lessons/:lessonId/progress', authorizeRoles(['admin', 'user']), tutorialController.trackProgress);
router.post('/lessons/:lessonId/exercises/:exerciseIndex/complete', authorizeRoles(['admin', 'user']), tutorialController.trackExerciseCompletion);
router.get('/user/progress', authorizeRoles(['admin', 'user']), tutorialController.getUserProgress);
router.post('/recommendations/:recommendationId/viewed', authorizeRoles(['admin', 'user']), tutorialController.markRecommendationViewed);
router.post('/exams/:attemptId/recommendations', authorizeRoles(['admin', 'user']), tutorialController.generateRecommendationsAfterExam);

// Admin routes
router.get('/admin/tutorials', authorizeRoles(['admin']), tutorialAdminController.getTutorials);
router.get('/admin/tutorials/:id', authorizeRoles(['admin']), tutorialAdminController.getTutorial);
router.post('/admin/tutorials', authorizeRoles(['admin']), tutorialAdminController.createTutorial);
router.put('/admin/tutorials/:id', authorizeRoles(['admin']), tutorialAdminController.updateTutorial);
router.delete('/admin/tutorials/:id', authorizeRoles(['admin']), tutorialAdminController.deleteTutorial);

router.get('/admin/tutorials/:tutorialId/lessons', authorizeRoles(['admin']), tutorialAdminController.getLessons);
router.get('/admin/lessons/:id', authorizeRoles(['admin']), tutorialAdminController.getLesson);
router.post('/admin/lessons', authorizeRoles(['admin']), tutorialAdminController.createLesson);
router.put('/admin/lessons/:id', authorizeRoles(['admin']), tutorialAdminController.updateLesson);
router.delete('/admin/lessons/:id', authorizeRoles(['admin']), tutorialAdminController.deleteLesson);

router.post('/admin/upload-image', authorizeRoles(['admin']), tutorialAdminController.uploadImage, tutorialAdminController.uploadLessonImage);
router.post('/admin/tutorials/:tutorialId/reorder-lessons', authorizeRoles(['admin']), tutorialAdminController.reorderLessons);
router.post('/admin/certifications/:certificationId/reorder-tutorials', authorizeRoles(['admin']), tutorialAdminController.reorderTutorials);
router.get('/admin/tutorials/:tutorialId/analytics', authorizeRoles(['admin']), tutorialAdminController.getTutorialAnalytics);

router.get('/admin/tutorials/stats', authorizeRoles(['admin']), tutorialAdminController.getTutorialStats);

// Import a single tutorial
router.post(
    '/admin/tutorials/import',
    authorizeRoles(['admin']),
    tutorialImportService.upload.single('tutorialFile'),
    tutorialImportController.importTutorial
  );
  
  // Batch import multiple tutorials
  router.post(
    '/admin/tutorials/batch-import',
    authorizeRoles(['admin']),
    tutorialImportService.upload.array('tutorialFiles', 20), // Max 20 files
    tutorialImportController.batchImportTutorials
  );
  
  // Export a tutorial
  router.get(
    '/admin/tutorials/:tutorialId/export',
    authorizeRoles(['admin']),
    tutorialImportController.exportTutorial
  );
  
  // Get import/export page
  router.get(
    '/admin/tutorials/import-export',
    authorizeRoles(['admin']),
    tutorialImportController.getImportExportPage
  );

module.exports = router;