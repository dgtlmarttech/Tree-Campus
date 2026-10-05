import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // mock logic of sendBulkDayNotification
  const start = 1;
  const end = 90;
  const notificationType = 'engagement';
  const results = [];

  for (let day = start; day <= end; day++) {
    const template = await mongoose.connection.collection('daynotificationtemplates').findOne({ day, notificationType });
    if (!template || !template.isActive) {
      results.push({ day, status: 'skipped', reason: 'no active template' });
      continue;
    }

    const dayIndex = day - 1;
    const progressDocs = await mongoose.connection.collection('courselearningprogresses').find({ currentDayIndex: dayIndex }).toArray();
    
    const userIds = progressDocs.map(p => p.userId);
    const users = await mongoose.connection.collection('users').find({ _id: { $in: userIds } }).toArray();

    let tokenCount = 0;
    users.forEach(u => {
      if (u.fcmToken) tokenCount++;
    });

    if (tokenCount === 0) {
      results.push({ day, status: 'no_recipients' });
      continue;
    }

    results.push({ day, status: 'sent', recipientCount: tokenCount });
  }

  console.log('Results for Day 1:', results.find(r => r.day === 1));
  console.log('Total sent:', results.filter(r => r.status === 'sent').length);
  
  process.exit(0);
});
