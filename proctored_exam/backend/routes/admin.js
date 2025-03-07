// routes/admin.js
const express = require('express');
const adminController = require('../controllers/adminController');
const { 
    validateCreateUser, 
    validateCertification,
 } = require('../utils/validators');
const {handleValidation} = require('../middleware/validation')

const router = express.Router();

router.get('/dashboard', adminController.getDashboard);
router.post('/users', validateCreateUser, handleValidation, adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/users/:userId', adminController.getUser);
router.put('/users/:userId/role', adminController.updateUserRole);
router.get('/certifications', adminController.getCertifications);
router.post('/certifications',validateCertification, handleValidation, adminController.createCertification);
router.get('/certifications/:id', adminController.getCertification)
router.put('/certifications/:id', adminController.updateCertification);
router.get('/domains', adminController.getAllDomains)
router.get('/exams', adminController.getExams);
router.post('/exams', adminController.createExam);
router.get('/exams/:id', adminController.getExam);
router.put('/exams/:id', adminController.updateExam);
router.delete('/exams/:id', adminController.deleteExam);
router.get('/questions', adminController.getQuestions);
router.get('/certifications/:certificationId/domains', adminController.getCertificationDomains);
router.post(
    '/questions/import',
    adminController.uploadQuestionsCsv,
    adminController.handleMulterError,
    adminController.importQuestions
  );
router.post('/questions', adminController.saveQuestion);
router.get('/questions/:id', adminController.getQuestion)
router.delete('/questions/:id', adminController.deleteQuestion);
router.get('/questions/:id/stats', adminController.getQuestionStats);
router.get('/questions/export', adminController.exportQuestions);
// router.get('/analytics', adminController.getAnalytics);
// router.get('/certifications/:id/analytics', adminController.getCertificationAnalytics);

module.exports = router;

