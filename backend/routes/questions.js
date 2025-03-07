// routes/api/questions.js
const express = require('express');
const questionController = require('../controllers/questionController');

const router = express.Router();

router.get('/certification/:certificationId', questionController.getQuestionsByCertification);
router.get('/:id', questionController.getQuestionById);
router.post('/:id/verify', questionController.verifyAnswer);
router.post('/:id/flag', questionController.flagQuestion);
router.get('/flagged', questionController.getFlaggedQuestions);
router.put('/flag/:id/:flagId', questionController.updateFlagStatus);

module.exports = router;