// Kanal boshqaruvi biznes logikasi
const Channel = require('../models/Channel');
const logger = require('../utils/logger');

/**
 * Yangi kanal qo'shish
 */
async function addChannel(title, link, channelId, isRequired = true) {
  try {
    const channel = await Channel.create({
      title,
      link,
      channelId,
      isRequired
    });

    logger.info(`Yangi kanal qo'shildi: ${channel._id}`);
    return channel;
  } catch (error) {
    logger.error('Kanal qo\'shishda xatolik:', error);
    throw error;
  }
}

/**
 * Kanalni o'chirish
 */
async function removeChannel(channelId) {
  try {
    const channel = await Channel.findByIdAndDelete(channelId);
    
    if (!channel) {
      throw new Error('Kanal topilmadi');
    }

    logger.info(`Kanal o'chirildi: ${channelId}`);
    return channel;
  } catch (error) {
    logger.error('Kanalni o\'chirishda xatolik:', error);
    throw error;
  }
}

/**
 * Barcha kanallarni olish
 */
async function getAllChannels() {
  try {
    return await Channel.find().sort({ createdAt: -1 });
  } catch (error) {
    logger.error('Kanallarni olishda xatolik:', error);
    return [];
  }
}

/**
 * Majburiy kanallarni olish
 */
async function getRequiredChannels() {
  try {
    return await Channel.find({ isRequired: true });
  } catch (error) {
    logger.error('Majburiy kanallarni olishda xatolik:', error);
    return [];
  }
}

/**
 * Foydalanuvchi obunasini tekshirish
 */
async function checkUserSubscription(bot, channelId, userId) {
  try {
    const member = await bot.telegram.getChatMember(channelId, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (error) {
    logger.error(`Obunani tekshirishda xatolik: channelId=${channelId}, userId=${userId}`, error);
    return false;
  }
}

module.exports = {
  addChannel,
  removeChannel,
  getAllChannels,
  getRequiredChannels,
  checkUserSubscription
};