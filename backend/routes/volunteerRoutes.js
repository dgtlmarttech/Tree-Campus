import express from 'express';
import {
  createVolunteer,
  getAllVolunteers,
  getVolunteerById,
  updateVolunteerStatus,
  deleteVolunteer
} from '../controllers/volunteerController.js';


import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// POST /api/volunteer - Submit volunteer application (Public)
router.post('/', createVolunteer);

// GET /api/volunteer - Get all volunteers (Admin)
router.get('/', protect, adminOnly, getAllVolunteers);

// GET /api/volunteer/:id - Get volunteer by ID (Admin)
router.get('/:id', protect, adminOnly, getVolunteerById);

// PATCH /api/volunteer/:id/status - Update volunteer status (Admin)
router.patch('/:id/status', protect, adminOnly, updateVolunteerStatus);

// DELETE /api/volunteer/:id - Delete volunteer (Admin)
router.delete('/:id', protect, adminOnly, deleteVolunteer);

export default router;
