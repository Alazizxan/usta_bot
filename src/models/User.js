// Foydalanuvchi modeli
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    default: null
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: null
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  subscribedChannels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indekslar - tez qidiruv uchun
userSchema.index({ username: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ points: -1 }); // Leaderboard uchun

module.exports = mongoose.model('User', userSchema);