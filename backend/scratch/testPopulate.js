import mongoose from 'mongoose';
import 'dotenv/config';
import CourseLearningProgress from '../models/CourseLearningProgress.js';
import User from '../models/User.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const dayIndex = 0; // Day 1

  const progressDocs = await CourseLearningProgress.find({ currentDayIndex: dayIndex })
    .populate('userId', 'fcmToken _id name');

  console.log(`Found ${progressDocs.length} progress docs`);

  const uniqueTokens = new Map();
  progressDocs.forEach(doc => {
    if (doc.userId && doc.userId.fcmToken) {
      uniqueTokens.set(doc.userId.fcmToken, doc.userId._id);
    }
  });

  console.log(`Unique tokens length:`, uniqueTokens.size);
  process.exit(0);
});
