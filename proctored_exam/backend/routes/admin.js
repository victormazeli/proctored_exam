const express = require('express');
const adminController = require('../controllers/adminController');
const { 
    validateCreateUser, 
    validateCertification,
 } = require('../utils/validators');
const {handleValidation} = require('../middleware/validation')
const {authenticateJWT, authorizeRoles} = require ('../middleware/auth')

const router = express.Router();

router.get('/dashboard', authenticateJWT, authorizeRoles(['admin']), adminController.getDashboard);
router.get('/active-exams/count', authenticateJWT, authorizeRoles(['admin']), adminController.getActiveExamCount);
router.get('/attempts', authenticateJWT, authorizeRoles(['admin']), adminController.getFilteredAttempts);
router.post('/users', validateCreateUser, handleValidation,  authenticateJWT, authorizeRoles(['admin']), adminController.createUser);
router.get('/users',  authenticateJWT, authorizeRoles(['admin']), adminController.getUsers);
router.get('/users/:userId',  authenticateJWT, authorizeRoles(['admin']), adminController.getUser);
router.put('/users/:userId/role',  authenticateJWT, authorizeRoles(['admin']), adminController.updateUserRole);
router.get('/certifications',  authenticateJWT, authorizeRoles(['admin']), adminController.getCertifications);
router.post('/certifications',validateCertification, handleValidation, adminController.createCertification);
router.get('/certifications/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.getCertification)
router.put('/certifications/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.updateCertification);
router.get('/domains',  authenticateJWT, authorizeRoles(['admin']), adminController.getAllDomains)
router.get('/exams',  authenticateJWT, authorizeRoles(['admin']), adminController.getExams);
router.post('/exams',  authenticateJWT, authorizeRoles(['admin']), adminController.createExam);
router.get('/exams/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.getExam);
router.put('/exams/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.updateExam);
router.delete('/exams/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.deleteExam);
router.get('/questions',  authenticateJWT, authorizeRoles('admin'), adminController.getQuestions);
router.get('/certifications/:certificationId/domains',  authenticateJWT, authorizeRoles(['admin']), adminController.getCertificationDomains);
router.post(
    '/questions/import',
    authenticateJWT, authorizeRoles('admin'),
    adminController.uploadQuestionsCsv,
    adminController.handleMulterError,
    adminController.importQuestions
  );
router.post('/questions',  authenticateJWT, authorizeRoles(['admin']), adminController.saveQuestion);
router.get('/questions/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.getQuestion)
router.delete('/questions/:id',  authenticateJWT, authorizeRoles(['admin']), adminController.deleteQuestion);
router.get('/questions/:id/stats',  authenticateJWT, authorizeRoles(['admin']), adminController.getQuestionStats);
router.get('/questions/export',  authenticateJWT, authorizeRoles(['admin']), adminController.exportQuestions);
// router.get('/analytics', adminController.getAnalytics);
// router.get('/certifications/:id/analytics', adminController.getCertificationAnalytics);

module.exports = router;

