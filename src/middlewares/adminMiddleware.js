// Admin ruxsatini tekshirish middleware
const logger = require('../utils/logger');
const { safeReply } = require('../utils/helpers');

/**
 * Faqat adminlar kirishi mumkin
 */
async function isAdmin(ctx, next) {
  try {
    if (!ctx.user) {
      await safeReply(ctx, '❌ Avval ro\'yxatdan o\'ting: /start');
      return;
    }

    if (!ctx.user.isAdmin) {
      await safeReply(ctx, '❌ Bu funksiya faqat adminlar uchun!');
      logger.warn(`Admin ruxsat rad etildi: ${ctx.user.telegramId}`);
      return;
    }

    return next();
  } catch (error) {
    logger.error('Admin middleware xatoligi:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

module.exports = {
  isAdmin
};