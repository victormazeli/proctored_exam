const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  }
});

const SettingsSchema = new mongoose.Schema({
  proctorEnabled: {
    type: Boolean,
    default: false
  },
  webcamPreference: {
    type: String,
    default: 'default'
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  }
});

const MetricsSchema = new mongoose.Schema({
  totalAttempts: {
    type: Number,
    default: 0
  },
  examsPassed: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number,
    default: 0
  },
  strengths: [{
    type: String
  }],
  weaknesses: [{
    type: String
  }]
});

const CertificationProgressSchema = new mongoose.Schema({
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Certification'
  },
  attemptsCount: {
    type: Number,
    default: 0
  },
  bestScore: {
    type: Number,
    default: 0
  },
  lastAttemptDate: {
    type: Date
  },
  estimatedReadiness: {
    type: Number,
    default: 0
  }
});

const UserSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  profile: ProfileSchema,
  settings: SettingsSchema,
  metrics: MetricsSchema,
  certificationProgress: [CertificationProgressSchema],
  lastLogin: {
    type: Date
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


module.exports = mongoose.model('User', UserSchema);
