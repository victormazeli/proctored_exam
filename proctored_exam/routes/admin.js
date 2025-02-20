// admin routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


router.get('/dashoard', adminController.getDashboard)

// ###### Users ######
router.get('/users', adminController.getUsers)
router.post('/users/role', adminController.updateUserRole)

// ###### Certifications ######
router.get('/certifications', adminController.getCertifications)
router.post('/certifications', adminController.createCertification)
// router.get('/certifications/:id', adminController.getCertification)
router.get('/certifications/:id/analytics', adminController.getCertificationAnalytics)
router.get('/certifications/:certificationId/domains', adminController.getCertification)
router.put('/certifications/:id', adminController.updateCertification)

// ###### Exams ######
router.get('/exams', adminController.getExams);
router.post('exams', adminController.createExam);
// router.get('/exams/:id', adminController.getExam);
router.put('/exams/:id', adminController.updateExam);
router.delete('/exams/:id', adminController.deleteExam);

// ###### Questions ######
router.get('/questions', adminController.getQuestions)
router.post('/questions/import', adminController.importQuestions)
router.post('/questions/export', adminController.exportQuestions)
router.post('/questions/save', adminController.saveQuestion)
router.get('/questions/:id/stats', adminController.getQuestionStats)
// router.get('/questions/:id', adminController.getQuestions)
router.delete('/questions/:id', adminController.deleteQuestion)

module.exports = router;