const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  name: {
    type: String,
    required: true
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Certification'
  },
  description: {
    type: String
  },
  questionCount: {
    type: Number,
    required: true
  },
  timeLimit: {
    type: Number,
    default: null
  },
  randomize: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('Exam', ExamSchema);
