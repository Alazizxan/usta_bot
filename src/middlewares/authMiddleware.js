// Foydalanuvchi autentifikatsiyasi va ro'yxatdan o'tish
const User = require('../models/User');
const logger = require('../utils/logger');
const { isUserAdmin } = require('../utils/helpers');

/**
 * Foydalanuvchini tekshirish va yangi bo'lsa ro'yxatdan o'tkazish
 */
async function ensureUser(ctx, next) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    let user = await User.findOne({ telegramId });

    if (!user) {
      // Yangi foydalanuvchi - session'da saqlash
      ctx.session = ctx.session || {};
      ctx.session.needsRegistration = true;
      return; // Keyingi middleware'ga o'tmaymiz
    }

    // Foydalanuvchi mavjud
    ctx.user = user;
    
    // Admin statusini yangilash .env dan
    const shouldBeAdmin = isUserAdmin(telegramId);
    if (user.isAdmin !== shouldBeAdmin) {
      user.isAdmin = shouldBeAdmin;
      await user.save();
      logger.info(`Admin status yangilandi: ${telegramId} -> ${shouldBeAdmin}`);
    }

    return next();
  } catch (error) {
    logger.error('Auth middleware xatoligi:', error);
    return next();
  }
}

/**
 * Foydalanuvchini session'dan olish yoki yaratish
 */
async function getOrCreateUser(ctx) {
  try {
    const telegramId = ctx.from?.id;
    if (!telegramId) return null;

    let user = await User.findOne({ telegramId });
    
    if (!user) {
      user = new User({
        telegramId,
        username: ctx.from.username || null,
        name: ctx.from.first_name || 'Foydalanuvchi',
        isAdmin: isUserAdmin(telegramId)
      });
      await user.save();
      logger.info(`Yangi foydalanuvchi yaratildi: ${telegramId}`);
    }

    return user;
  } catch (error) {
    logger.error('Foydalanuvchini olish/yaratishda xatolik:', error);
    return null;
  }
}

module.exports = {
  ensureUser,
  getOrCreateUser
};