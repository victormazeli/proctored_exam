const mongoose = require('mongoose');

const LeaderboardEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  rank: {
    type: Number
  },
  certificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certification'
  },
  timeframe: {
    type: String,
    enum: ['weekly', 'monthly', 'allTime'],
    default: 'allTime'
  },
  examsCompleted: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  certsPassed: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound index for quicker lookups
LeaderboardEntrySchema.index({ certificationId: 1, timeframe: 1, score: -1 });
LeaderboardEntrySchema.index({ userId: 1, certificationId: 1, timeframe: 1 }, { unique: true });

module.exports = mongoose.model('LeaderboardEntry', LeaderboardEntrySchema);