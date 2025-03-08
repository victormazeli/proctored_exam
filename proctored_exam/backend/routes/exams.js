// routes/exams.js
const express = require('express');
const examController = require('../controllers/examController');

const router = express.Router();

router.get('', examController.getExams);
router.get('/certifications', examController.getCertifications);
router.get('/:certId/select', examController.selectExam);
router.get('/:examId/instructions', examController.examInstructions);
router.get('/:examId/start', examController.startExam);
router.post('/:examId/submit', examController.submitExamAnswers);
router.post('/:attemptId/progress', examController.saveProgress);
router.get('/results/:attemptId', examController.examResults);
router.get('/check/attempt/:examId', examController.checkExamAttempt);
router.get('/:attemptId/resume', examController.resumeExam);

module.exports = router;