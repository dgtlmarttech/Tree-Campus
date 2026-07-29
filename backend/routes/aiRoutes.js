import express from 'express';
const router = express.Router();
import {
  askQuestion,
  getChatHistory,
  getConversation,
  deleteConversation,
} from '../controllers/aiController.js';
import { askTeacher } from '../controllers/teacherController.js';
import { getTTS } from '../controllers/ttsController.js';
import { streamAudio } from '../controllers/ttsStreamController.js';
import {
  getCourseStructure,
  getProgress,
  saveProgress,
  askCourseLearning,
} from '../controllers/courseLearningController.js';
import { protect } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';

// All routes are protected
router.post('/ask', protect, [
  body('question').notEmpty().withMessage('Question is required'),
  validate,
], askQuestion);

router.get('/history', protect, getChatHistory);
router.get('/conversation/:id', protect, getConversation);
router.delete('/conversation/:id', protect, deleteConversation);

// 3D Teacher Routes
router.post('/teacher/ask', protect, askTeacher);
router.get('/teacher/tts', protect, getTTS);
router.get('/teacher/stream-audio', protect, streamAudio);

// Course Learning Mode Routes
router.get('/course-learning/structure/:courseId', protect, getCourseStructure);
router.get('/course-learning/progress/:courseId', protect, getProgress);
router.post('/course-learning/progress/:courseId', protect, saveProgress);
router.post('/course-learning/ask', protect, askCourseLearning);

export default router;

