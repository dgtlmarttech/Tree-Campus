import DayNotificationTemplate from '../models/DayNotificationTemplate.js';
import CourseLearningProgress from '../models/CourseLearningProgress.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendFCMNotification } from '../utils/fcmHelper.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/day-notifications
// Get all 90-day templates (optionally filter by day or type)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllTemplates = async (req, res) => {
  try {
    const { day, notificationType } = req.query;
    const filter = {};
    if (day) filter.day = parseInt(day, 10);
    if (notificationType) filter.notificationType = notificationType;

    const templates = await DayNotificationTemplate.find(filter).sort({ day: 1, notificationType: 1 });
    res.json({ success: true, templates, total: templates.length });
  } catch (error) {
    console.error('Error fetching day notification templates:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/day-notifications/:day
// Get all 3 templates for a specific day
// ─────────────────────────────────────────────────────────────────────────────
export const getTemplatesForDay = async (req, res) => {
  try {
    const day = parseInt(req.params.day, 10);
    if (isNaN(day) || day < 1 || day > 90) {
      return res.status(400).json({ success: false, message: 'Invalid day. Must be 1-90.' });
    }

    const templates = await DayNotificationTemplate.find({ day }).sort({ notificationType: 1 });
    res.json({ success: true, day, templates });
  } catch (error) {
    console.error('Error fetching templates for day:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/day-notifications/:id
// Update a specific template (admin edits title/body/route)
// ─────────────────────────────────────────────────────────────────────────────
export const updateTemplate = async (req, res) => {
  try {
    const { title, body, route, extraData, isActive } = req.body;

    const template = await DayNotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { title, body, route, extraData, isActive } },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/day-notifications/send
// Send a day notification to all users on that journey day
//
// Body: { day, notificationType }
//   day: 1–90
//   notificationType: 'zoom_info' | 'zoom_started' | 'engagement'
// ─────────────────────────────────────────────────────────────────────────────
export const sendDayNotification = async (req, res) => {
  try {
    const { day, notificationType } = req.body;

    if (!day || !notificationType) {
      return res.status(400).json({ success: false, message: 'day and notificationType are required.' });
    }

    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 90) {
      return res.status(400).json({ success: false, message: 'day must be between 1 and 90.' });
    }

    const validTypes = ['zoom_info', 'zoom_started', 'engagement'];
    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({ success: false, message: `notificationType must be one of: ${validTypes.join(', ')}` });
    }

    // 1. Fetch the template
    const template = await DayNotificationTemplate.findOne({ day: dayNum, notificationType });
    if (!template) {
      return res.status(404).json({ success: false, message: `No template found for Day ${dayNum} / ${notificationType}` });
    }
    if (!template.isActive) {
      return res.status(400).json({ success: false, message: 'This notification template is disabled.' });
    }

    // 2. Find all users currently on this journey day
    //    currentDayIndex is 0-based, so Day 1 = index 0
    const dayIndex = dayNum - 1;
    const progressDocs = await CourseLearningProgress.find({ currentDayIndex: dayIndex })
      .populate('userId', 'fcmToken _id name');

    const uniqueTokens = new Map(); // token → userId
    progressDocs.forEach(doc => {
      if (doc.userId && doc.userId.fcmToken) {
        uniqueTokens.set(doc.userId.fcmToken, doc.userId._id);
      }
    });

    const tokens = Array.from(uniqueTokens.keys());
    const userIds = Array.from(uniqueTokens.values());

    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        message: `No users currently on Day ${dayNum} with valid FCM tokens.`,
        recipientCount: 0
      });
    }

    // 3. Build FCM data payload
    const fcmData = {
      type: notificationType === 'zoom_info' || notificationType === 'zoom_started'
        ? 'live_class'
        : 'learning_journey',
      route: template.route || '/dashboard',
      targetDay: dayNum.toString(),
      notificationType,
      ...(template.extraData || {}),
    };

    // 4. Send FCM in 500-token chunks
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const fcmResponse = await sendFCMNotification(chunk, template.title, template.body, fcmData);
      if (fcmResponse) {
        totalSuccess += fcmResponse.successCount || 0;
        totalFailure += fcmResponse.failureCount || 0;
      }
    }

    // 5. Save individual Notification records for each recipient (for in-app history)
    const notificationDocs = userIds.map(userId => ({
      userId,
      title: template.title,
      body: template.body,
      type: fcmData.type,
      route: template.route,
      referenceId: dayNum.toString(),
      isRead: false,
    }));

    await Notification.insertMany(notificationDocs, { ordered: false });

    // 6. Update lastSentAt on template
    template.lastSentAt = new Date();
    await template.save();

    res.status(200).json({
      success: true,
      message: `Day ${dayNum} / ${notificationType} notification sent.`,
      day: dayNum,
      notificationType,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
    });

  } catch (error) {
    console.error('Error sending day notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/day-notifications/send-bulk
// Send a notification type to a RANGE of days at once (e.g. all users on Days 1–5)
// Body: { startDay, endDay, notificationType }
// ─────────────────────────────────────────────────────────────────────────────
export const sendBulkDayNotification = async (req, res) => {
  try {
    const { startDay, endDay, notificationType } = req.body;

    if (!startDay || !endDay || !notificationType) {
      return res.status(400).json({ success: false, message: 'startDay, endDay and notificationType are required.' });
    }

    const start = parseInt(startDay, 10);
    const end = parseInt(endDay, 10);

    if (isNaN(start) || isNaN(end) || start < 1 || end > 90 || start > end) {
      return res.status(400).json({ success: false, message: 'Invalid day range. Must be 1–90, startDay <= endDay.' });
    }

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
        const userIds = Array.from(uniqueTokens.values());

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

        const notificationDocs = userIds.map(userId => ({
          userId,
          title: template.title,
          body: template.body,
          type: fcmData.type,
          route: template.route,
          referenceId: day.toString(),
          isRead: false,
        }));
        await Notification.insertMany(notificationDocs, { ordered: false });

        template.lastSentAt = new Date();
        await template.save();

        results.push({ day, status: 'sent', recipientCount: tokens.length, successCount: totalSuccess, failureCount: totalFailure });

      } catch (dayErr) {
        console.error(`Error processing day ${day}:`, dayErr);
        results.push({ day, status: 'error', error: dayErr.message });
      }
    }

    res.status(200).json({ success: true, results });

  } catch (error) {
    console.error('Error in sendBulkDayNotification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/day-notifications/stats
// Quick stats: how many users are on each journey day
// ─────────────────────────────────────────────────────────────────────────────
export const getDayStats = async (req, res) => {
  try {
    const stats = await CourseLearningProgress.aggregate([
      {
        $match: { currentDayIndex: { $gte: 0, $lte: 89 } }
      },
      {
        $group: {
          _id: '$currentDayIndex',
          userCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map to day numbers (1-based)
    const mapped = stats.map(s => ({
      day: s._id + 1,
      userCount: s.userCount
    }));

    res.json({ success: true, stats: mapped });
  } catch (error) {
    console.error('Error fetching day stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};