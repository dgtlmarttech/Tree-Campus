import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  type: {
    type: String, // e.g., 'live_class', 'general', 'assignment'
    required: true,
  },
  route: {
    type: String, // Optional deep link or route path in Flutter
  },
  referenceId: {
    type: String, // ID related to the notification (e.g., Live Class ID)
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
