// Statistika va leaderboard
const User = require('../models/User');
const Reward = require('../models/Reward');
const UserReward = require('../models/UserReward');
const PointsHistory = require('../models/PointsHistory');
const logger = require('../utils/logger');

/**
 * Umumiy statistika
 */
async function getGeneralStatistics() {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalRewards,
      claimedRewards,
      totalPoints
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAdmin: true }),
      Reward.countDocuments({ isActive: true }),
      UserReward.countDocuments({ status: 'claimed' }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: '$points' } } }
      ])
    ]);

    const totalPointsValue = totalPoints.length > 0 ? totalPoints[0].total : 0;

    return {
      totalUsers,
      totalAdmins,
      totalRewards,
      claimedRewards,
      totalPoints: totalPointsValue
    };
  } catch (error) {
    logger.error('Statistika olishda xatolik:', error);
    return null;
  }
}

/**
 * Top 10 foydalanuvchilar (leaderboard)
 */
async function getLeaderboard(limit = 10) {
  try {
    return await User.find()
      .sort({ points: -1 })
      .limit(limit)
      .select('name username points');
  } catch (error) {
    logger.error('Leaderboard olishda xatolik:', error);
    return [];
  }
}

/**
 * Foydalanuvchi ballar tarixi
 */
async function getUserPointsHistory(userId, limit = 10) {
  try {
    return await PointsHistory.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .populate('adminId', 'name username');
  } catch (error) {
    logger.error('Ballar tarixini olishda xatolik:', error);
    return [];
  }
}

/**
 * Eng ko'p olingan mukofotlar
 */
async function getTopRewards(limit = 5) {
  try {
    const topRewards = await UserReward.aggregate([
      { $match: { status: 'claimed' } },
      { $group: { _id: '$rewardId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    const rewardIds = topRewards.map(r => r._id);
    const rewards = await Reward.find({ _id: { $in: rewardIds } });

    return topRewards.map(tr => {
      const reward = rewards.find(r => r._id.toString() === tr._id.toString());
      return {
        reward,
        count: tr.count
      };
    });
  } catch (error) {
    logger.error('Top mukofotlarni olishda xatolik:', error);
    return [];
  }
}

module.exports = {
  getGeneralStatistics,
  getLeaderboard,
  getUserPointsHistory,
  getTopRewards
};