import express from 'express';
import {
  createSchoolRegistration,
  getAllSchoolRegistrations,
  getSchoolRegistrationById,
  updateSchoolRegistrationStatus,
  deleteSchoolRegistration
} from '../controllers/schoolRegistration.js';
// import { validateSchoolRegistration } from '../middleware/schoolRegistrationValidator.js';

import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// POST /api/registerSchool - Submit school registration (Public)
router.post('/', createSchoolRegistration);

// GET /api/registerSchool - Get all school registrations (Admin)
router.get('/', protect, adminOnly, getAllSchoolRegistrations);

// GET /api/registerSchool/:id - Get school registration by ID (Admin)
router.get('/:id', protect, adminOnly, getSchoolRegistrationById);

// PATCH /api/registerSchool/:id/status - Update school registration status (Admin)
router.patch('/:id/status', protect, adminOnly, updateSchoolRegistrationStatus);

// DELETE /api/registerSchool/:id - Delete school registration (Admin)
router.delete('/:id', protect, adminOnly, deleteSchoolRegistration);

export default router;
