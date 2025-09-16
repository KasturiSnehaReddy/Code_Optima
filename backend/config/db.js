const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use MongoDB Atlas connection string or local MongoDB
    const mongoURI = process.env.MONGO_CONN;
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    console.log("MongoDB connected successfully");
    
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    console.log("Please ensure MongoDB is running or update the connection string");
  }
};

module.exports = connectDB;