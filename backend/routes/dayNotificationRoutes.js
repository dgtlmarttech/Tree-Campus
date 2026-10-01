import express from 'express';
import {
  getAllTemplates,
  getTemplatesForDay,
  updateTemplate,
  sendDayNotification,
  sendBulkDayNotification,
  getDayStats,
} from '../controllers/dayNotificationController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly as admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(admin);

// Template management
router.get('/', getAllTemplates);                   // GET all templates (filter: ?day=1&notificationType=zoom_info)
router.get('/stats', getDayStats);                 // GET per-day user count stats
router.get('/:day', getTemplatesForDay);           // GET 3 templates for a specific day
router.put('/:id', updateTemplate);               // PUT update a template by _id

// Sending
router.post('/send', sendDayNotification);         // POST send one type for one day
router.post('/send-bulk', sendBulkDayNotification); // POST send one type for a range of days

export default router;