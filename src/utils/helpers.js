// Yordamchi funksiyalar
const logger = require('./logger');

/**
 * Xabarni xavfsiz yuborish - xatoliklarni ushlash bilan
 */
async function safeReply(ctx, message, extra = {}) {
  try {
    await ctx.reply(message, extra);
  } catch (error) {
    logger.error('Xabar yuborishda xatolik:', error);
  }
}

/**
 * Callback queryni javob berish
 */
async function answerCallback(ctx, text = '✅', showAlert = false) {
  try {
    await ctx.answerCbQuery(text, { show_alert: showAlert });
  } catch (error) {
    logger.error('Callback javob berishda xatolik:', error);
  }
}

/**
 * Xabarni tahrirlash
 */
async function safeEditMessage(ctx, text, extra = {}) {
  try {
    await ctx.editMessageText(text, extra);
  } catch (e) {
    await ctx.reply(text, extra);
  }
}

/**
 * Telefon raqamini formatlash
 */
function formatPhone(phone) {
  if (!phone) return 'N/A';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Ballarni formatlash
 */
function formatPoints(points) {
  return points.toLocaleString('uz-UZ');
}

/**
 * Sanani formatlash
 */
function formatDate(date) {
  return new Date(date).toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Admin IDlarni olish .env dan
 */
function getAdminIds() {
  const adminIds = process.env.ADMIN_IDS || '';
  return adminIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
}

/**
 * Foydalanuvchi adminligini tekshirish
 */
function isUserAdmin(telegramId) {
  const adminIds = getAdminIds();
  return adminIds.includes(telegramId);
}

/**
 * Xabar matnini chunk'larga bo'lish (4096 belgidan oshsa)
 */
function chunkMessage(text, maxLength = 4096) {
  const chunks = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  
  return chunks;
}

/**
 * Error handling wrapper - async funksiyalar uchun
 */
function asyncHandler(fn) {
  return async (ctx, next) => {
    try {
      await fn(ctx, next);
    } catch (error) {
      logger.error('Handler xatoligi:', error);
      await safeReply(ctx, '❌ Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    }
  };
}

module.exports = {
  safeReply,
  answerCallback,
  safeEditMessage,
  formatPhone,
  formatPoints,
  formatDate,
  getAdminIds,
  isUserAdmin,
  chunkMessage,
  asyncHandler
};