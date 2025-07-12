const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the MongoDB database:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
