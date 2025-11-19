// src/services/adminService.js
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');
const Reward = require('../models/Reward');
const UserReward = require('../models/UserReward');
const Channel = require('../models/Channel');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Broadcast message to all users (or filtered)
 */
async function broadcast(text, telegram) {
  const users = await User.find({}).lean();
  let success = 0;
  let fail = 0;
  const promises = users.map(async (u) => {
    try {
      await telegram.sendMessage(u.telegramId, text);
      success += 1;
    } catch (err) {
      fail += 1;
    }
  });
  await Promise.all(promises);
  logger.info('Broadcast finished', { success, fail });
  return { successCount: success, failCount: fail };
}

/**
 * Get statistics
 */
async function getStatistics() {
  const totalUsers = await User.countDocuments();
  const agg = await User.aggregate([{ $group: { _id: null, totalPoints: { $sum: '$points' } } }]);
  const totalPoints = agg[0] ? agg[0].totalPoints : 0;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const activeUsers7d = await User.countDocuments({ updatedAt: { $gte: oneWeekAgo } });
  return { totalUsers, totalPoints, activeUsers7d };
}

/**
 * Add or remove points (atomic)
 */
async function adminChangePoints(telegramTargetId, delta, reason, adminId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOne({ telegramId: telegramTargetId }).session(session);
    if (!user) throw new Error('User not found');

    const newPoints = user.points + delta;
    if (newPoints < 0) throw new Error('Insufficient balance');

    user.points = newPoints;
    await user.save({ session });

    const hist = new PointsHistory({
      userId: user._id,
      amount: delta,
      reason,
      adminId,
      date: new Date(),
    });
    await hist.save({ session });

    await session.commitTransaction();
    session.endSession();
    logger.info('Admin changed points', { adminId, telegramTargetId, delta });
    return { success: true };
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    logger.error('adminChangePoints error', err);
    return { success: false, message: err.message };
  }
}

/**
 * Grant a reward to user (admin)
 */
async function adminGrantRewardToUser(telegramTargetId, rewardId, adminId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOne({ telegramId: telegramTargetId }).session(session);
    const reward = await Reward.findById(rewardId).session(session);
    if (!user) throw new Error('User not found');
    if (!reward) throw new Error('Reward not found');

    // do not change points, just create a UserReward
    const ur = new UserReward({
      userId: user._id,
      rewardId: reward._id,
      status: 'claimed',
      claimedAt: new Date(),
    });
    await ur.save({ session });

    await session.commitTransaction();
    session.endSession();
    logger.info('Admin granted reward', { adminId, telegramTargetId, rewardId });
    return { success: true };
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    logger.error('adminGrantRewardToUser error', err);
    return { success: false, message: err.message };
  }
}

/**
 * Add or remove channels
 */
async function addChannel({ title, link, channelId, description }) {
  const ch = new Channel({ title, link, channelId, description });
  return await ch.save();
}

async function removeChannel(channelId) {
  return await Channel.findOneAndDelete({ channelId });
}

module.exports = {
  broadcast,
  getStatistics,
  adminChangePoints,
  adminGrantRewardToUser,
  addChannel,
  removeChannel,
};
