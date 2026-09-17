import express from 'express';
import { getCurrentJourneyState, updateSectionAction } from '../controllers/learningJourneyController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/current', protect, getCurrentJourneyState);
router.post('/section/action', protect, updateSectionAction);

export default router;
