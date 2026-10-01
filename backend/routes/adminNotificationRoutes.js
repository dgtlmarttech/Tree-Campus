import express from 'express';
import { sendAdminNotification, getAdminNotifications } from '../controllers/adminNotificationController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly as admin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.post('/send', sendAdminNotification);
router.get('/', getAdminNotifications);

export default router;
