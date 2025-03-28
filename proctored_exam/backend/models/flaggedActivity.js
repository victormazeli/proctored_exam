const mongoose = require('mongoose');

const FlaggedActivitySchema = new mongoose.Schema({
  attemptId: {
    type: Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  certificationId: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('FlaggedActivity', FlaggedActivitySchema);