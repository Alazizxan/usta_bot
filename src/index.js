// Entry point - foydalanuvchi uchun kirish nuqtasi
require('dotenv').config();
const connectDB = require('./config/database');
const bot = require('./bot');
const logger = require('./utils/logger');

// MongoDB ulanish
connectDB();

// Botni ishga tushirish
bot.launch()
  .then(() => {
    logger.info('🚀 Bot muvaffaqiyatli ishga tushdi');
    console.log('✅ Bot is running...');
  })
  .catch((error) => {
    logger.error('Bot ishga tushishda xatolik:', error);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('Bot to\'xtatilmoqda (SIGINT)...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  logger.info('Bot to\'xtatilmoqda (SIGTERM)...');
  bot.stop('SIGTERM');
});

// Tutilmagan xatoliklarni ushlash
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});