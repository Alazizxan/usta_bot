// src/middlewares/errorMiddleware.js
const logger = require('../utils/logger');

async function errorHandler(ctx, next) {
  try {
    await next();
  } catch (err) {
    logger.error('Unhandled error in middleware chain', err);
    try {
      await ctx.reply('An unexpected error occurred.');
    } catch (err2) {
      logger.error('Failed to notify user about error', err2);
    }
  }
}

module.exports = { errorHandler };
