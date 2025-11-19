// Mukofotlar biznes logikasi
const Reward = require('../models/Reward');
const UserReward = require('../models/UserReward');
const User = require('../models/User');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { updateUserPoints } = require('./userService');

/**
 * Barcha faol mukofotlarni olish
 */
async function getActiveRewards() {
  try {
    return await Reward.find({ isActive: true }).sort({ costPoints: 1 });
  } catch (error) {
    logger.error('Mukofotlarni olishda xatolik:', error);
    return [];
  }
}

async function removeReward(rewardId) {
  const reward = await Reward.findById(rewardId);
  if (!reward) throw new Error('Mukofot topilmadi');
  await reward.deleteOne();
}


/**
 * Mukofotni olish (atomik tranzaksiya)
 */
async function claimReward(userId, rewardId) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Mukofotni tekshirish
    const reward = await Reward.findById(rewardId).session(session);
    if (!reward || !reward.isActive) {
      throw new Error('Mukofot mavjud emas yoki faol emas');
    }

    // Stock tekshirish
    if (reward.stock !== -1 && reward.stock <= 0) {
      throw new Error('Mukofot tugagan');
    }

    // Foydalanuvchi ballarini tekshirish
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    if (user.points < reward.costPoints) {
      throw new Error('Yetarli ball yo\'q');
    }

    // Ballarni ayirish
    await updateUserPoints(userId, -reward.costPoints, `Mukofot olindi: ${reward.title}`);

    // Stock'ni kamaytirish (agar cheksiz bo'lmasa)
    if (reward.stock !== -1) {
      reward.stock -= 1;
      await reward.save({ session });
    }

    // UserReward yaratish
    const userReward = await UserReward.create([{
      userId,
      rewardId,
      status: 'claimed'
    }], { session });

    await session.commitTransaction();
    logger.info(`Mukofot olindi: userId=${userId}, rewardId=${rewardId}`);
    
    return { user, reward, userReward: userReward[0] };
  } catch (error) {
    await session.abortTransaction();
    logger.error('Mukofotni olishda xatolik:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Foydalanuvchi mukofotlarini olish
 */
async function getUserRewards(userId) {
  try {
    return await UserReward.find({ userId })
      .populate('rewardId')
      .sort({ claimedAt: -1 });
  } catch (error) {
    logger.error('Foydalanuvchi mukofotlarini olishda xatolik:', error);
    return [];
  }
}

/**
 * Admin tomonidan mukofot berish
 */
async function grantReward(userId, rewardId, adminId) {
  try {
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      throw new Error('Mukofot topilmadi');
    }

    const userReward = await UserReward.create({
      userId,
      rewardId,
      status: 'claimed'
    });

    logger.info(`Admin mukofot berdi: userId=${userId}, rewardId=${rewardId}, adminId=${adminId}`);
    return userReward;
  } catch (error) {
    logger.error('Mukofot berishda xatolik:', error);
    throw error;
  }
}

/**
 * Foydalanuvchidan mukofotni o'chirish
 */
async function removeUserReward(userRewardId, adminId) {
  try {
    const userReward = await UserReward.findByIdAndUpdate(
      userRewardId,
      { status: 'cancelled' },
      { new: true }
    );

    if (!userReward) {
      throw new Error('Mukofot topilmadi');
    }

    logger.info(`Mukofot o'chirildi: userRewardId=${userRewardId}, adminId=${adminId}`);
    return userReward;
  } catch (error) {
    logger.error('Mukofotni o\'chirishda xatolik:', error);
    throw error;
  }
}

/**
 * Yangi mukofot yaratish
 */
async function createReward(title, description, costPoints, stock = -1) {
  try {
    const reward = await Reward.create({
      title,
      description,
      costPoints,
      stock
    });

    logger.info(`Yangi mukofot yaratildi: ${reward._id}`);
    return reward;
  } catch (error) {
    logger.error('Mukofot yaratishda xatolik:', error);
    throw error;
  }
}


module.exports = {
    getActiveRewards,
    getUserRewards,
    claimReward,
    createReward,
    removeReward,
    removeUserReward,
    grantReward
};