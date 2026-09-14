import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, registerToken } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getNotifications);
router.post('/register-token', registerToken);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
