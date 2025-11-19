const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  costPoints: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: -1, // -1 = cheksiz
    validate: {
      validator: function (v) {
        return v >= -1;
      },
      message: 'Stock -1 yoki undan katta bo\'lishi kerak'
    }
  },
  imageFileId: {
    type: String,
    required: false
  },
  isActive: {
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

rewardSchema.index({ costPoints: 1 });
rewardSchema.index({ isActive: 1 });

module.exports = mongoose.model('Reward', rewardSchema);