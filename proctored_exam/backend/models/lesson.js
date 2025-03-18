const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  tutorialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutorial',
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 10
  },
  domainMappings: [{
    domainId: {
      type: String,
      required: true
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
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


const PracticalExerciseSchema = new mongoose.Schema({
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    instructions: {
      type: String,
      required: true
    },
    expectedOutput: {
      type: String
    },
    solution: {
      type: String
    },
    hints: [{
      text: String,
      order: Number
    }],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate'
    },
    estimatedTime: {
      type: Number, // in minutes
      default: 15
    }
  });
  
  // Add to the LessonSchema
  LessonSchema.add({
    practicalExercises: [PracticalExerciseSchema]
  });

module.exports = mongoose.model('Lesson', LessonSchema);