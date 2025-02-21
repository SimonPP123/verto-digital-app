const mongoose = require('mongoose');

// Token limits and constants
const TOKEN_LIMIT = 128000;
const TOKEN_CLEANUP_THRESHOLD = TOKEN_LIMIT * 0.9; // 90% of limit

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: false },
  tokens: { type: Number, default: 0 },
  size: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'error'],
    default: 'pending'
  },
  error: { type: String }
});

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  tokens: {
    type: Number,
    default: 0
  }
});

const chatSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    default: function() {
      return `Chat ${new Date().toLocaleString()}`;
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [messageSchema],
  files: [fileSchema],
  totalTokens: {
    type: Number,
    default: 0
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
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
chatSessionSchema.index({ isActive: 1 });

// Update lastActivity on new messages
chatSessionSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// Static constants
chatSessionSchema.statics.TOKEN_LIMIT = TOKEN_LIMIT;
chatSessionSchema.statics.TOKEN_CLEANUP_THRESHOLD = TOKEN_CLEANUP_THRESHOLD;

module.exports = mongoose.model('ChatSession', chatSessionSchema); 