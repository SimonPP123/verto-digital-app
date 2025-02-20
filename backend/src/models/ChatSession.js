const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  activeFile: {
    originalName: { type: String },
    path: { type: String },
    type: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
chatSessionSchema.index({ user: 1 });
chatSessionSchema.index({ lastActivity: 1 });

// Update lastActivity on new messages
chatSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('ChatSession', chatSessionSchema); 