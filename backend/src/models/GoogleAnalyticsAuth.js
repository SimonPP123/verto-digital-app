const mongoose = require('mongoose');

const googleAnalyticsAuthSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  scope: {
    type: String,
    required: true
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for faster queries
googleAnalyticsAuthSchema.index({ user: 1 });

const GoogleAnalyticsAuth = mongoose.model('GoogleAnalyticsAuth', googleAnalyticsAuthSchema);

module.exports = GoogleAnalyticsAuth; 