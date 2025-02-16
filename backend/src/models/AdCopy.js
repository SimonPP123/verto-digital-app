const mongoose = require('mongoose');

const adCopySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaign_name: {
    type: String,
    required: true
  },
  input_channels: {
    type: String,
    required: true
  },
  variations: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  landing_page_content: {
    type: String,
    required: true
  },
  content_material: String,
  additional_information: String,
  keywords: String,
  internal_knowledge: String,
  asset_link: String,
  landing_page_url: {
    type: String,
    required: true
  },
  tone_and_language: String
}, {
  timestamps: true
});

// Create indexes
adCopySchema.index({ user: 1 });
adCopySchema.index({ campaign_name: 1 });

const AdCopy = mongoose.model('AdCopy', adCopySchema);

module.exports = AdCopy; 