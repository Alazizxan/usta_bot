// Foydalanuvchi mukofotlari modeli
const mongoose = require('mongoose');

const userRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rewardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reward',
    required: true
  },
  status: {
    type: String,
    enum: ['claimed', 'delivered', 'cancelled'],
    default: 'claimed'
  },
  claimedAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userRewardSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('UserReward', userRewardSchema);