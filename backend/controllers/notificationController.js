import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
      
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Register FCM device token
// @route   POST /api/notifications/register-token
// @access  Private
export const registerToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }
    
    await User.findByIdAndUpdate(userId, { fcmToken });
    
    res.json({ success: true, message: 'FCM Token registered successfully' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
