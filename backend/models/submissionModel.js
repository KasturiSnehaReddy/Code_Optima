const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  code: {
    type: String,
    required: true,
    maxlength: 50000, // Limit code to 50KB
  },
  language: {
    type: String,
    required: true,
  },
  execTime: {
    type: Number,
    default: 0,
  },
  memory: {
    type: Number,
    default: 0,
  },
  timeComplexity: {
    type: String,
    default: 'Unknown',
  },
  passed: {
    type: Boolean,
    default: false,
  },
  testsPassed: {
    type: Number,
    default: 0,
  },
  testsTotal: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
submissionSchema.index({ roomId: 1, userId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
