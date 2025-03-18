// routes/exams.js
const express = require('express');
const examController = require('../controllers/examController');
const { authorizeRoles} = require ('../middleware/auth')

const router = express.Router();

router.get('', authorizeRoles(['admin', 'user']), examController.getExams);
router.get('/certifications', authorizeRoles(['admin', 'user']), examController.getCertifications);
router.get('/:examId/start', authorizeRoles(['admin', 'user']), examController.startExam);
router.post('/submit', authorizeRoles(['admin', 'user']), examController.submitExamAnswers);
router.post('/attempts/:attemptId/progress', authorizeRoles(['admin', 'user']), examController.saveProgress);
router.get('/attempts/:attemptId/results', authorizeRoles(['admin', 'user']), examController.examResults);
router.get('/attempts/check/:examId', authorizeRoles(['admin', 'user']), examController.checkExamAttempt);
router.get('/attempts/:attemptId/resume', authorizeRoles(['admin', 'user']), examController.resumeExam);

module.exports = router;