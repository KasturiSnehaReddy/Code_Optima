const mongoose = require("mongoose");

let projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  projLanguage: {
    type: String,
    required: true,
    enum: ["python", "java", "javascript", "cpp", "c", "go", "bash"]
  },
  code: {
    type: String,
    required: true,
    maxlength: 100000, // Limit to 100KB
  },
  createdBy: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  version: {
    type: String,
    required: true,
  },
  timeComplexityAnalysis: {
    type: String,
    default: null,
    maxlength: 5000, // Limit analysis to 5KB
  },
  optimizedSolution: {
    type: String,
    default: null,
    maxlength: 10000, // Limit optimized solution to 10KB
  }
});

// Index for faster queries
projectSchema.index({ createdBy: 1, date: -1 });

module.exports = mongoose.model("Project", projectSchema);