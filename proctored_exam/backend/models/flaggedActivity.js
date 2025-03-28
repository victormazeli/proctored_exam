const mongoose = require('mongoose');

const FlaggedActivitySchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certification'
  },
  reason: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  evidence: {
    type: String // Could store a URL to screenshot/video evidence
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolution: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('FlaggedActivity', FlaggedActivitySchema);