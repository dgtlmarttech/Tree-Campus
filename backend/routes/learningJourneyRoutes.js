import express from 'express';
import { getCurrentJourneyState, updateSectionAction } from '../controllers/learningJourneyController.js';
import { requireAuth } from '../middleware/authMiddleware.js'; // Assuming this exists

const router = express.Router();

router.get('/current', requireAuth, getCurrentJourneyState);
router.post('/section/action', requireAuth, updateSectionAction);

export default router;
