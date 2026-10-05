import mongoose from 'mongoose';
import 'dotenv/config';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const zoomInfo = await mongoose.connection.db.collection('daynotificationtemplates').findOne({ day: 1, notificationType: 'zoom_info' });
  console.log('Day 1 zoom_info:', zoomInfo);
  process.exit(0);
});
