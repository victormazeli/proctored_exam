// routes/exams.js
const express = require('express');
const examController = require('../controllers/examController');

const router = express.Router();

router.get('/select', examController.selectCertification);
router.get('/:certId/select', examController.selectExam);
router.get('/:examId/instructions', examController.examInstructions);
router.get('/:examId/start', examController.startExam);
router.post('/:examId/submit', examController.submitExamAnswers);
router.get('/results/:attemptId', examController.examResults);
router.get('/resume/:attemptId', examController.resumeExam);

module.exports = router;