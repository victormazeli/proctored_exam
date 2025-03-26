const mongoose = require('mongoose');

const TutorialRecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examAttemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attempt',
    required: true
  },
  tutorialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutorial'
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  domain: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 50
  },
  viewed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TutorialRecommendation', TutorialRecommendationSchema);
