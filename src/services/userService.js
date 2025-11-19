// Foydalanuvchi biznes logikasi
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Foydalanuvchini username yoki telefon orqali qidirish
 */
async function searchUser(query) {
  try {
    const user = await User.findOne({
      $or: [
        { username: new RegExp(query, 'i') },
        { phone: query },
        { name: new RegExp(query, 'i') }
      ]
    });
    
    return user;
  } catch (error) {
    logger.error('Foydalanuvchini qidirishda xatolik:', error);
    return null;
  }
}

/**
 * Foydalanuvchiga ball qo'shish/ayirish (atomik)
 */
async function updateUserPoints(userId, amount, reason, adminId = null) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomik yangilash
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { points: amount } },
      { new: true, session }
    );

    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    // Agar ballar manfiy bo'lsa, xatolik
    if (user.points < 0) {
      throw new Error('Ballar manfiy bo\'lishi mumkin emas');
    }

    // Tarixni saqlash
    await PointsHistory.create([{
      userId,
      amount,
      reason,
      adminId
    }], { session });

    await session.commitTransaction();
    logger.info(`Ballar yangilandi: userId=${userId}, amount=${amount}, reason=${reason}`);
    
    return user;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Ballarni yangilashda xatolik:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Foydalanuvchi admin qilish/adminlikdan olish
 */
async function toggleAdminStatus(userId, makeAdmin) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isAdmin: makeAdmin },
      { new: true }
    );

    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    logger.info(`Admin status o'zgartirildi: userId=${userId}, isAdmin=${makeAdmin}`);
    return user;
  } catch (error) {
    logger.error('Admin statusni o\'zgartirishda xatolik:', error);
    throw error;
  }
}

/**
 * Barcha foydalanuvchilarni olish (broadcast uchun)
 */
async function getAllUsers(filter = {}) {
  try {
    return await User.find(filter);
  } catch (error) {
    logger.error('Foydalanuvchilarni olishda xatolik:', error);
    return [];
  }
}

/**
 * Foydalanuvchini telefon raqami bilan yangilash
 */
async function updateUserPhone(telegramId, phone) {
  try {
    const user = await User.findOneAndUpdate(
      { telegramId },
      { phone },
      { new: true }
    );
    
    logger.info(`Telefon raqami yangilandi: telegramId=${telegramId}`);
    return user;
  } catch (error) {
    logger.error('Telefon raqamini yangilashda xatolik:', error);
    throw error;
  }
}

module.exports = {
  searchUser,
  updateUserPoints,
  toggleAdminStatus,
  getAllUsers,
  updateUserPhone
};