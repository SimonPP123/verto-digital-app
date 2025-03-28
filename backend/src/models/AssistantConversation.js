const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
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
});

const AgentSchema = new Schema({
  name: {
    type: String,
    required: true,
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
    default: 'Default agent'
  },
  ga4AccountId: {
    type: String,
    default: ''
  }
});

const AssistantConversationSchema = new Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [MessageSchema],
  isArchived: {
    type: Boolean,
    default: false
  },
  agent: AgentSchema,
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

module.exports = mongoose.model('AssistantConversation', AssistantConversationSchema); 