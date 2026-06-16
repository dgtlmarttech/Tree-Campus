import express from 'express';
import { getCertificates, getCertificate, getCertificateStatus, saveCertificateFromMobile, verifyCertificate, getAllCertificatesAdmin } from '../controllers/certificateController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.get('/verify/:certificateNumber', verifyCertificate);

router.use(protect);

// Admin route - must be before /:id to avoid route conflict
router.get('/admin/all', authorize('admin'), getAllCertificatesAdmin);

router.get('/', getCertificates);
router.get('/status', getCertificateStatus);
router.post('/save-from-mobile', saveCertificateFromMobile);
router.get('/:id', getCertificate);

export default router;

