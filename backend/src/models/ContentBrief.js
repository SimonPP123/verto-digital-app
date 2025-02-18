const mongoose = require('mongoose');

const contentBriefSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  keyword: String,
  competitors: String,
  target_audience: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ContentBrief', contentBriefSchema); 