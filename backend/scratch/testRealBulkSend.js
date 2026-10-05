import mongoose from 'mongoose';
import 'dotenv/config';
import { sendFCMNotification } from '../utils/fcmHelper.js';
import DayNotificationTemplate from '../models/DayNotificationTemplate.js';
import CourseLearningProgress from '../models/CourseLearningProgress.js';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const start = 1;
  const end = 1;
  const notificationType = 'engagement';
  const results = [];

  for (let day = start; day <= end; day++) {
    try {
      const template = await DayNotificationTemplate.findOne({ day, notificationType });
      if (!template || !template.isActive) {
        results.push({ day, status: 'skipped', reason: 'no active template' });
        continue;
      }

      const dayIndex = day - 1;
      const progressDocs = await CourseLearningProgress.find({ currentDayIndex: dayIndex })
        .populate('userId', 'fcmToken _id');

      const uniqueTokens = new Map();
      progressDocs.forEach(doc => {
        if (doc.userId && doc.userId.fcmToken) {
          uniqueTokens.set(doc.userId.fcmToken, doc.userId._id);
        }
      });

      const tokens = Array.from(uniqueTokens.keys());
      
      if (tokens.length === 0) {
        results.push({ day, status: 'no_recipients' });
        continue;
      }

      const fcmData = {
        type: notificationType === 'zoom_info' || notificationType === 'zoom_started' ? 'live_class' : 'learning_journey',
        route: template.route || '/dashboard',
        targetDay: day.toString(),
        notificationType,
        ...(template.extraData || {}),
      };

      const CHUNK_SIZE = 500;
      let totalSuccess = 0;
      let totalFailure = 0;
      for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);
        const resp = await sendFCMNotification(chunk, template.title, template.body, fcmData);
        if (resp) {
          totalSuccess += resp.successCount || 0;
          totalFailure += resp.failureCount || 0;
        }
      }

      results.push({ day, status: 'sent', recipientCount: tokens.length, successCount: totalSuccess, failureCount: totalFailure });
    } catch (err) {
      console.error(err);
      results.push({ day, status: 'error', error: err.message });
    }
  }

  console.log('Results:', results);
  process.exit(0);
});
