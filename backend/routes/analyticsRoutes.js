import express from 'express';
import { getOverview, getCourseAnalytics, getEnrollmentAnalytics, getRegistrationAnalytics, getCertificateAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly);

router.get('/overview', getOverview);
router.get('/courses', getCourseAnalytics);
router.get('/enrollments', getEnrollmentAnalytics);
router.get('/registrations', getRegistrationAnalytics);
router.get('/certificates', getCertificateAnalytics);

export default router;
