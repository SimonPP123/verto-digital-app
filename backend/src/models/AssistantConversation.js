const mongoose = require('mongoose');

const assistantConversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    name: {
      type: String,
      default: 'BigQuery Agent'
    },
    webhookUrl: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: 'database'
    },
    description: {
      type: String,
      default: 'Default BigQuery agent'
    }
  },
  messages: [{
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
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

// Pre-save hook to update the updatedAt timestamp
assistantConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AssistantConversation', assistantConversationSchema); 