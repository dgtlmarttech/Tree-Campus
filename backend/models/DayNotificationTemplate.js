import mongoose from 'mongoose';

/**
 * DayNotificationTemplate
 * 
 * Stores day-wise notification content for the 90-day learning journey.
 * Each document represents ONE notification type for ONE day.
 * 
 * This enables:
 *  - Admin to edit content from admin panel without app updates
 *  - Scheduled/automated sending by backend cron jobs
 *  - 3 notification types per day: zoom_info, zoom_started, engagement
 *
 * notificationType:
 *   'zoom_info'    → Sent ~1hr before scheduled Zoom class (Day Notification Type 1)
 *   'zoom_started' → Sent when Zoom class starts (Day Notification Type 2)
 *   'engagement'   → Generic daily engagement nudge (Day Notification Type 3)
 */
const dayNotificationTemplateSchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 90,
  },
  notificationType: {
    type: String,
    required: true,
    enum: ['zoom_info', 'zoom_started', 'engagement'],
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
    trim: true,
  },
  // Flutter route to navigate to on tap
  route: {
    type: String,
    default: '/dashboard',
  },
  // FCM data payload extras (passed as-is to Flutter)
  extraData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Whether this template is active (admin can disable individual days)
  isActive: {
    type: Boolean,
    default: true,
  },
  // Tracks the last time this template was sent (for audit/dedupe)
  lastSentAt: {
    type: Date,
  },
}, { timestamps: true });

// Compound unique index: one template per day+type
dayNotificationTemplateSchema.index({ day: 1, notificationType: 1 }, { unique: true });

const DayNotificationTemplate = mongoose.model('DayNotificationTemplate', dayNotificationTemplateSchema);
export default DayNotificationTemplate;