const mongoose = require('mongoose');

const QuestionAttemptSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Question'
  },
  userAnswers: [{
    type: String,
    required: true
  }],
  correct: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number,
    required: true
  },
  flagged: {
    type: Boolean,
    default: false
  }
});

const ProctorEventSchema = new mongoose.Schema({
  time: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    default: {}
  }
});

const DomainScoreSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  questionsCount: {
    type: Number,
    required: true
  }
});

const ScoreSchema = new mongoose.Schema({
  overall: {
    type: Number,
    required: true
  },
  byDomain: [DomainScoreSchema]
});

const AttemptSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Exam'
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Certification'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  timeSpent: {
    type: Number
  },
  completed: {
    type: Boolean,
    default: false
  },
  questions: [QuestionAttemptSchema],
  proctorEvents: [ProctorEventSchema],
  score: ScoreSchema,
  passed: {
    type: Boolean
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

module.exports = mongoose.model('Attempt', AttemptSchema);
