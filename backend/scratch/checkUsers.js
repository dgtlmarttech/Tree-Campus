import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // Get users on Day 1 (currentDayIndex: 0)
  const progressDocs = await db.collection('courselearningprogresses').find({ currentDayIndex: 0 }).toArray();
  console.log('Users on Day 1:', progressDocs.length);

  if (progressDocs.length > 0) {
    const userIds = progressDocs.map(p => p.userId);
    const users = await db.collection('users').find({ _id: { $in: userIds } }).toArray();
    
    const usersWithToken = users.filter(u => u.fcmToken && u.fcmToken.trim() !== '');
    console.log('Users on Day 1 with FCM token:', usersWithToken.length);
  }

  process.exit(0);
});
