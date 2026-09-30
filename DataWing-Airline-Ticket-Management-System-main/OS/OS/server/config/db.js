const mongoose = require('mongoose');
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`⚠️ MongoDB not connected: ${err.message}`);
    console.log('⚠️ Running without database');
  }
};
module.exports = connectDB;
