const express = require('express');
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const activeExamsController = require('../controllers/activeExamsController');
const { 
    validateCreateUser, 
    validateCertification,
 } = require('../utils/validators');
const {handleValidation} = require('../middleware/validation')
const {authorizeRoles} = require ('../middleware/auth')

const router = express.Router();

router.get('/dashboard', authorizeRoles(['admin']), adminController.getDashboard);
router.get('/active-exams/count', authorizeRoles(['admin']), adminController.getActiveExamCount);
router.get('/attempts', authorizeRoles(['admin']), adminController.getFilteredAttempts);
router.post('/users', validateCreateUser, handleValidation, authorizeRoles(['admin']), adminController.createUser);
router.get('/users', authorizeRoles(['admin']), adminController.getUsers);
router.get('/users/:userId', authorizeRoles(['admin']), adminController.getUser);
router.put('/users/:userId/role', authorizeRoles(['admin']), adminController.updateUserRole);
router.get('/certifications', authorizeRoles(['admin']), adminController.getCertifications);
router.post('/certifications',validateCertification, handleValidation, adminController.createCertification);
router.get('/certifications/:id', authorizeRoles(['admin']), adminController.getCertification)
router.put('/certifications/:id', authorizeRoles(['admin']), adminController.updateCertification);
router.get('/domains', authorizeRoles(['admin']), adminController.getAllDomains)
router.get('/exams', authorizeRoles(['admin']), adminController.getExams);
router.post('/exams', authorizeRoles(['admin']), adminController.createExam);
router.get('/exams/active', activeExamsController.getActiveExams);
router.get('/exams/:id', authorizeRoles(['admin']), adminController.getExam);

router.get('/exams/sessions/:sessionId/logs', activeExamsController.getSessionActivityLogs);

router.post('/exams/sessions/:sessionId/terminate', activeExamsController.terminateExamSession);

router.post('/exams/sessions/:sessionId/flag', activeExamsController.flagSession);

router.post('/exams/sessions/:sessionId/warn', activeExamsController.sendWarningToUser);

router.post('/exams/flagged-activities/:activityId/dismiss', activeExamsController.dismissFlaggedActivity);
router.put('/exams/:id', authorizeRoles(['admin']), adminController.updateExam);
router.delete('/exams/:id', authorizeRoles(['admin']), adminController.deleteExam);
router.get('/questions', authorizeRoles('admin'), adminController.getQuestions);
router.get('/certifications/:certificationId/domains', authorizeRoles(['admin']), adminController.getCertificationDomains);
router.post(
    '/questions/import',
 authorizeRoles('admin'),
    adminController.uploadQuestionsCsv,
    adminController.handleMulterError,
    adminController.importQuestions
  );
router.post('/questions', authorizeRoles(['admin']), adminController.saveQuestion);
router.get('/questions/:id', authorizeRoles(['admin']), adminController.getQuestion)
router.delete('/questions/:id', authorizeRoles(['admin']), adminController.deleteQuestion);
router.get('/questions/:id/stats', authorizeRoles(['admin']), adminController.getQuestionStats);
router.get('/questions/export', authorizeRoles(['admin']), adminController.exportQuestions);

/**
 * Analytics Routes
 */
router.get('/analytics', analyticsController.getAdminAnalytics);

router.get('/analytics/certifications', analyticsController.getCertificationAnalytics);



module.exports = router;

