const mongoose = require('mongoose');

const UserBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeId: {
    type: String,
    required: true
  },
  earnedDate: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  }
});

// Compound index to ensure a user doesn't get the same badge twice
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model('UserBadge', UserBadgeSchema);