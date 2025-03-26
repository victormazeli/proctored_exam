const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ActivityLogSchema = new Schema({
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
  type: {
    type: String,
    enum: ['info', 'warning', 'violation', 'flag', 'admin_action', 'system'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});