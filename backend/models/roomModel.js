const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  maxMembers: {
    type: Number,
    default: 10,
    min: 2,
    max: 10,
  },
  question: {
    id: String,
    title: String,
    description: String,
    inputFormat: String,
    outputFormat: String,
    constraints: String,
    samples: [{
      input: String,
      output: String,
    }],
    hiddenTestcases: [{
      input: String,
      output: String,
    }],
  },
  status: {
    type: String,
    enum: ['open', 'running', 'finished'],
    default: 'open',
  },
  duration: {
    type: Number,
    default: 3600000, // 1 hour in milliseconds
  },
  startTime: Date,
  endTime: Date,
  rankings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rank: Number,
    userName: String,
    passed: Boolean,
    submittedAt: Date,
    timeComplexity: String,
    execTime: Number,
    badges: [String],
    rankReason: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
roomSchema.index({ status: 1, createdAt: -1 });
roomSchema.index({ 'members': 1 });

module.exports = mongoose.model('Room', roomSchema);
