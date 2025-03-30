const mongoose = require('mongoose');

const assistantTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    defaultValue: String,
    type: {
      type: String,
      enum: ['text', 'multiChoice', 'date', 'dateRange'],
      default: 'text'
    },
    uiType: {
      type: String,
      enum: ['select', 'multiChoice'],
      default: null
    },
    options: [String] // For multiChoice variables
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Pre-save hook to update the updatedAt timestamp
assistantTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AssistantTemplate', assistantTemplateSchema); 