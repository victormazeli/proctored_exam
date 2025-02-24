// routes/admin.js
const express = require('express');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.put('/users/role', adminController.updateUserRole);
router.get('/certifications', adminController.getCertifications);
router.post('/certifications', adminController.createCertification);
router.get('/certifications/:id', adminController.getCertification)
router.put('/certifications/:id', adminController.updateCertification);
router.get('/exams', adminController.getExams);
router.post('/exams', adminController.createExam);
router.get('/exams/:id', adminController.getExam);
router.put('/exams/:id', adminController.updateExam);
router.delete('/exams/:id', adminController.deleteExam);
router.get('/questions', adminController.getQuestions);
router.get('/certifications/:certificationId/domains', adminController.getCertificationDomains);
router.post('/questions/import', adminController.importQuestions);
router.post('/questions', adminController.saveQuestion);
router.get('/questions/:id', adminController.getQuestion)
router.delete('/questions/:id', adminController.deleteQuestion);
router.get('/questions/:id/stats', adminController.getQuestionStats);
router.get('/questions/export', adminController.exportQuestions);
// router.get('/analytics', adminController.getAnalytics);
// router.get('/certifications/:id/analytics', adminController.getCertificationAnalytics);

module.exports = router;

