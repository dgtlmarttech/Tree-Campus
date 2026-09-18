import express from 'express';
import AppConfig from '../models/AppConfig.js';
import { protect, authorize } from '../middleware/auth.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// GET /api/config/whatsapp
// Public endpoint to get WhatsApp community configuration
router.get('/whatsapp', async (req, res) => {
  try {
    const config = await AppConfig.findOne({ key: 'whatsapp_community' });
    if (config) {
      res.json(config.value);
    } else {
      // Default fallback
      res.json({ link: '', isEnabled: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /api/config/whatsapp
// Admin only endpoint to update WhatsApp community configuration
router.put('/whatsapp', protect, authorize('admin'), [
  body('link').optional().isURL().withMessage('Valid URL is required'),
  body('isEnabled').isBoolean().withMessage('isEnabled must be a boolean'),
  validate,
], async (req, res) => {
  try {
    const { link, isEnabled } = req.body;
    const value = { link: link || '', isEnabled };

    let config = await AppConfig.findOne({ key: 'whatsapp_community' });
    if (config) {
      config.value = value;
      await config.save();
    } else {
      config = await AppConfig.create({
        key: 'whatsapp_community',
        value
      });
    }

    res.json({ message: 'WhatsApp configuration updated successfully', data: config.value });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
