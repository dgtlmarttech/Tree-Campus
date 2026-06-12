import express from 'express';
import { getCertificates, getCertificate, getCertificateStatus, saveCertificateFromMobile, verifyCertificate } from '../controllers/certificateController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route
router.get('/verify/:certificateNumber', verifyCertificate);

router.use(protect);

router.get('/', getCertificates);
router.get('/status', getCertificateStatus);
router.post('/save-from-mobile', saveCertificateFromMobile);
router.get('/:id', getCertificate);

export default router;
