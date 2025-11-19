// MongoDB ulanish konfiguratsiyasi
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`✅ MongoDB ulanish muvaffaqiyatli: ${conn.connection.host}`);
    
    // Ulanish xatoliklarini kuzatish
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB ulanish xatoligi:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB ulanishi uzildi');
    });

  } catch (error) {
    logger.error('MongoDB ulanish xatoligi:', error);
    process.exit(1);
  }
};

module.exports = connectDB;