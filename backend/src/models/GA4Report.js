const mongoose = require('mongoose');

const ga4ReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: String,
    required: true
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  metrics: {
    type: [String],
    required: true
  },
  dimensions: {
    type: [String],
    required: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  reportFormat: {
    type: String,
    enum: ['summary', 'detailed', 'highlights'],
    default: 'summary'
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
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
ga4ReportSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('GA4Report', ga4ReportSchema); 