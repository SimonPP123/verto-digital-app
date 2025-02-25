const mongoose = require('mongoose');

const audienceAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  websiteUrl: {
    type: String,
    required: true
  },
  businessPersona: {
    type: String,
    required: true
  },
  jobFunctions: {
    type: [String],
    required: true
  },
  content: {
    type: String,
    default: 'Processing...'
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

// Update the updatedAt timestamp on save
audienceAnalysisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AudienceAnalysis', audienceAnalysisSchema); 