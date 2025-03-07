const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  }
});

const AnalyticsSchema = new mongoose.Schema({
  timesAnswered: {
    type: Number,
    default: 0
  },
  timesCorrect: {
    type: Number,
    default: 0
  },
  avgTimeSpent: {
    type: Number,
    default: 0
  },
  difficultyRating: {
    type: Number,
    default: 0
  }
});

const QuestionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Certification'
  },
  domain: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  options: [OptionSchema],
  correctAnswers: [{
    type: String,
    required: true
  }],
  explanation: {
    type: String
  },
  difficulty: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  tags: [{
    type: String
  }],
  analytics: {
    type: AnalyticsSchema,
    default: {}
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    ref: 'User'
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

module.exports = mongoose.model('Question', QuestionSchema);
