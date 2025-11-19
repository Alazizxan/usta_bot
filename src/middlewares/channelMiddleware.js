// Kanal obunasini tekshirish
const Channel = require('../models/Channel');
const logger = require('../utils/logger');
const { Markup } = require('telegraf');

/**
 * Foydalanuvchi barcha majburiy kanallarga obuna bo'lganligini tekshirish
 */
async function checkChannelSubscription(ctx, next) {
  try {
    if (!ctx.user) return next();

    const requiredChannels = await Channel.find({ isRequired: true });
    
    if (requiredChannels.length === 0) {
      return next();
    }

    const unsubscribedChannels = [];

    for (const channel of requiredChannels) {
      try {
        const member = await ctx.telegram.getChatMember(channel.channelId, ctx.user.telegramId);
        
        if (!['member', 'administrator', 'creator'].includes(member.status)) {
          unsubscribedChannels.push(channel);
        }
      } catch (error) {
        logger.error(`Kanal statusini tekshirishda xatolik: ${channel.channelId}`, error);
        // Xatolik bo'lsa, davom etamiz
      }
    }

    if (unsubscribedChannels.length > 0) {
      // Obuna bo'lmagan kanallar mavjud
      const buttons = unsubscribedChannels.map(channel => [
        Markup.button.url(channel.title, channel.link)
      ]);
      
      buttons.push([Markup.button.callback('✅ Obunani tekshirish', 'check_subscription')]);

      await ctx.reply(
        '❌ Botdan foydalanish uchun quyidagi kanallarga obuna bo\'ling:\n\n' +
        unsubscribedChannels.map((ch, i) => `${i + 1}. ${ch.title}`).join('\n'),
        Markup.inlineKeyboard(buttons)
      );
      
      return;
    }

    return next();
  } catch (error) {
    logger.error('Kanal middleware xatoligi:', error);
    return next(); // Xatolik bo'lsa ham davom etamiz
  }
}

module.exports = {
  checkChannelSubscription
};