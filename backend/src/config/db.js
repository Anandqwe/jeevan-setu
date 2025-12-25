const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/jeevan-setu');
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB] Error: ${error.message}`);
    console.warn('[DB] Continuing without database connection. Auth features will not work.');
    // Don't exit, allow server to run without DB for testing other features
  }
};

module.exports = connectDB;
