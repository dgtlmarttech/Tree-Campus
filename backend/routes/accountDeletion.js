import express from 'express';
import {
  createDeletionRequest,
  verifyDeletionRequest,
  getAllDeletionRequests,
  getDeletionRequestById,
  updateDeletionStatus,
  cancelDeletionRequest,
  deleteDeletionRequest
} from '../controllers/accountDeletion.js';

import { protect } from '../middleware/auth.js';
import { adminOnly } from '../middleware/adminMiddleware.js';

const router = express.Router();

// POST /api/account-deletion-request - Submit deletion request
router.post('/', createDeletionRequest);

// GET /api/account-deletion-request/verify/:token - Verify email
router.get('/verify/:token', verifyDeletionRequest);

// GET /api/account-deletion-requests - Get all requests (Admin)
router.get('/all', protect, adminOnly, getAllDeletionRequests);

// GET /api/account-deletion-request/:id - Get request by ID (Admin)
router.get('/:id', protect, adminOnly, getDeletionRequestById);

// PATCH /api/account-deletion-request/:id/status - Update status (Admin)
router.patch('/:id/status', protect, adminOnly, updateDeletionStatus);

// DELETE /api/account-deletion-request/:id - Cancel request (Admin)
router.delete('/:id', protect, adminOnly, cancelDeletionRequest);

// DELETE /api/account-deletion-request/:id/permanent - Permanent Delete (Admin)
router.delete('/:id/permanent', protect, adminOnly, deleteDeletionRequest);

export default router;
