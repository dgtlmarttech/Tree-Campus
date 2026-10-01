import AdminNotification from '../models/AdminNotification.js';
import User from '../models/User.js';
import CourseLearningProgress from '../models/CourseLearningProgress.js';
import { sendFCMNotification } from '../utils/fcmHelper.js';

// @desc    Send a push notification to users
// @route   POST /api/admin/notifications/send
// @access  Private/Admin
export const sendAdminNotification = async (req, res) => {
  try {
    const { title, message, type, targetScreen, imageUrl, target, targetDay, userIds } = req.body;
    const adminId = req.user.id;

    if (!title || !message || !type || !target) {
      return res.status(400).json({ success: false, message: 'Please provide title, message, type, and target.' });
    }

    let tokens = [];
    let recipientIds = [];
    
    // Determine recipients
    if (target === 'all') {
      const users = await User.find({ fcmToken: { $exists: true, $ne: '' } }).select('fcmToken _id');
      tokens = users.map(u => u.fcmToken);
      recipientIds = users.map(u => u._id);
    } else if (target === 'specific' || target === 'selected') {
      if (!userIds || !userIds.length) {
        return res.status(400).json({ success: false, message: 'Please provide userIds for specific/selected target.' });
      }
      const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: '' } }).select('fcmToken _id');
      tokens = users.map(u => u.fcmToken);
      recipientIds = users.map(u => u._id);
    } else if (target === 'journey') {
      if (targetDay === undefined || targetDay === null) {
        return res.status(400).json({ success: false, message: 'Please provide targetDay for journey target.' });
      }
      // targetDay from frontend is usually 1-based (Day 1, Day 2). currentDayIndex is 0-based.
      const dayIndex = parseInt(targetDay, 10) - 1;
      
      const progressDocs = await CourseLearningProgress.find({ currentDayIndex: dayIndex })
                                .populate('userId', 'fcmToken _id');
      
      const uniqueTokens = new Set();
      const uniqueUserIds = new Set();
      progressDocs.forEach(doc => {
        if (doc.userId && doc.userId.fcmToken) {
          uniqueTokens.add(doc.userId.fcmToken);
          uniqueUserIds.add(doc.userId._id.toString());
        }
      });
      tokens = Array.from(uniqueTokens);
      recipientIds = Array.from(uniqueUserIds);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid target specified.' });
    }

    if (tokens.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid FCM tokens found for the selected target.' });
    }

    // Build data payload for deep link
    const data = {
      type: type,
    };
    if (targetScreen) {
      data.route = targetScreen;
    }
    if (imageUrl) {
      data.imageUrl = imageUrl;
    }
    if (target === 'journey' && targetDay) {
      data.targetDay = targetDay.toString();
    }

    // Since Firebase Multicast limit is 500, we should handle chunking if there are > 500 tokens
    // but fcmHelper.sendFCMNotification handles arrays directly (if chunking is not in fcmHelper, we'll chunk it here)
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const fcmResponse = await sendFCMNotification(chunk, title, message, data);
      
      if (fcmResponse) {
        totalSuccess += fcmResponse.successCount || 0;
        totalFailure += fcmResponse.failureCount || 0;
      }
    }

    // Log the notification to DB
    const adminNotification = await AdminNotification.create({
      title,
      body: message,
      type,
      route: targetScreen,
      target,
      targetDetails: target === 'journey' ? targetDay : userIds,
      imageUrl,
      recipientCount: tokens.length,
      successCount: totalSuccess,
      failureCount: totalFailure,
      adminId
    });

    res.status(201).json({
      success: true,
      message: 'Notification campaign processed',
      data: adminNotification
    });

  } catch (error) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get sent notifications history
// @route   GET /api/admin/notifications
// @access  Private/Admin
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
