const mongoose = require('mongoose');

const UserProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  tutorialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutorial',
    required: true
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure a user has only one progress entry per lesson
UserProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', UserProgressSchema);