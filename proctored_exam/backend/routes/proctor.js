
// routes/proctor.js
const express = require('express');
const proctorController = require('../controllers/proctorController');

const router = express.Router();

router.post('/initialize/:attemptId', proctorController.initializeProctoring);
router.post('/violation/:attemptId', proctorController.logViolation);
router.get('/status/:attemptId', proctorController.getProctorStatus);
router.get('/active', proctorController.getActiveExams);
router.put('/settings', proctorController.updateProctorSettings);
router.post('/analyze/:attemptId', proctorController.analyzeProctorEvents);
router.post('/message/:attemptId', proctorController.sendProctorMessage);
router.post('/terminate/:attemptId', proctorController.terminateExam);
router.get('/violation-summary/:attemptId', proctorController.getViolationSummary);

module.exports = router;
