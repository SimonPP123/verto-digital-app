const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  campaignName: {
    type: String,
    required: true
  },
  landingPageContent: {
    type: String,
    required: true
  },
  landingPageUrl: {
    type: String,
    required: true
  },
  additionalInfo: String,
  keywords: String,
  internalKnowledge: String,
  assetLink: String,
  toneAndLanguage: String,
  contentMaterial: String
}, {
  timestamps: true
});

// Create indexes
templateSchema.index({ user: 1 });
templateSchema.index({ name: 1 });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template; 