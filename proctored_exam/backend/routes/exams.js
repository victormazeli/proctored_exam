// routes/exams.js
const express = require('express');
const examController = require('../controllers/examController');
const {authenticateJWT, authorizeRoles} = require ('../middleware/auth')

const router = express.Router();

router.get('', authenticateJWT, authorizeRoles(['admin', 'user']), examController.getExams);
router.get('/certifications', authenticateJWT, authorizeRoles(['admin', 'user']), examController.getCertifications);
router.get('/:certId/select', authenticateJWT, authorizeRoles(['admin', 'user']), examController.selectExam);
router.get('/:examId/instructions', authenticateJWT, authorizeRoles(['admin', 'user']), examController.examInstructions);
router.get('/:examId/start', authenticateJWT, authorizeRoles(['admin', 'user']), examController.startExam);
router.post('/submit', authenticateJWT, authorizeRoles(['admin', 'user']), examController.submitExamAnswers);
router.post('/attempts/:attemptId/progress', authenticateJWT, authorizeRoles(['admin', 'user']), examController.saveProgress);
router.get('/attempts/:attemptId/results', authenticateJWT, authorizeRoles(['admin', 'user']), examController.examResults);
router.get('/attempts/check/:examId', authenticateJWT, authorizeRoles(['admin', 'user']), examController.checkExamAttempt);
router.get('/attempts/:attemptId/resume', authenticateJWT, authorizeRoles(['admin', 'user']), examController.resumeExam);

module.exports = router;