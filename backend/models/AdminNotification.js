import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  type: {
    type: String, 
    required: true, // e.g., 'general', 'live_class', 'learning_journey'
  },
  route: {
    type: String,
  },
  target: {
    type: String,
    required: true, // 'all', 'specific', 'selected', 'journey'
  },
  targetDetails: {
    type: mongoose.Schema.Types.Mixed, // Array of user IDs, or journey day number
  },
  imageUrl: {
    type: String,
  },
  recipientCount: {
    type: Number,
    default: 0,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  failureCount: {
    type: Number,
    default: 0,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
export default AdminNotification;
