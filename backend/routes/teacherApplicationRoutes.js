import express from 'express';
import multer from 'multer';
import {
  applyTeacher,
  verifyTeacherOTP,
  resendTeacherOTP,
  getTeacherApplications,
  updateTeacherStatus,
  deleteTeacherApplication
} from '../controllers/teacherApplicationController.js';
import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Multer memory storage configuration for receiving resume and video
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // Limit: 20MB (to allow video uploads)
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp'
      ];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Resume must be a PDF, DOC, DOCX, or Image file.'));
      }
    } else if (file.fieldname === 'demoVideo') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Demo video must be a valid video file.'));
      }
    } else {
      cb(new Error('Unexpected field.'));
    }
  }
});

const cpUpload = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 }
]);

// Handle Multer upload errors gracefully in Express
const uploadFieldsMiddleware = (req, res, next) => {
  cpUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }
    next();
  });
};

// Public Routes
router.post('/apply', uploadFieldsMiddleware, applyTeacher);
router.post('/verify-otp', verifyTeacherOTP);
router.post('/resend-otp', resendTeacherOTP);

// Protected Admin Routes
router.get('/', protect, adminOnly, getTeacherApplications);
router.patch('/:id/status', protect, adminOnly, updateTeacherStatus);
router.delete('/:id', protect, adminOnly, deleteTeacherApplication);

export default router;
