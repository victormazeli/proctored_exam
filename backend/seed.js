/**
 * seed-users.js
 * 
 * This script seeds the database with an admin and a regular user account
 * Run with: node seed-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/certification-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for seeding...'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function seedUsers() {
  try {
    // Clear existing users - CAUTION: This deletes all users!
    // Comment this out if you just want to add users without removing existing ones
    // await User.deleteMany({});
    // console.log('Existing users cleared');

    // Generate hashed passwords
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const userPassword = await bcrypt.hash('user123', salt);

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@elysolabs.com',
      password: adminPassword,
      role: 'admin',
      profile: {
        name: 'Admin User',
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff'
      },
      settings: {
        proctorEnabled: true,
        webcamPreference: 'default',
        notificationsEnabled: true
      },
      metrics: {
        totalAttempts: 5,
        examsPassed: 5,
        averageScore: 95,
        totalTimeSpent: 240,
        strengths: ['Security', 'Networking', 'Cloud Architecture'],
        weaknesses: []
      },
      lastLogin: new Date()
    });

    // Create regular user
    const regularUser = new User({
      username: 'cipher',
      email: 'cipher@elysolabs.com',
      password: userPassword,
      role: 'user',
      profile: {
        name: 'Regular User',
        avatar: 'https://ui-avatars.com/api/?name=Regular+User&background=2E7D32&color=fff'
      },
      settings: {
        proctorEnabled: true,
        webcamPreference: 'high_quality',
        notificationsEnabled: true
      },
      metrics: {
        totalAttempts: 3,
        examsPassed: 1,
        averageScore: 75,
        totalTimeSpent: 180,
        strengths: ['Programming', 'Data Structures'],
        weaknesses: ['Security', 'DevOps']
      },
      lastLogin: new Date()
    });

    // Save users to database
    await admin.save();
    await regularUser.save();

    console.log('Users seeded successfully:');
    console.log('Admin: admin@elysolabs.com / admin123');
    console.log('User: cipher@elysolabs.com / user123');

    // Success - exit
    mongoose.disconnect();
    console.log('Done! Database connection closed.');
  } catch (error) {
    console.error('Error seeding users:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seed function
seedUsers();