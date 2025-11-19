// Kanal modeli
const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true,
    unique: true
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Channel', channelSchema);