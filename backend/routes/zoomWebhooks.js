import express from 'express';
import crypto from 'crypto';
import LiveClass from '../models/LiveClass.js';
import { verifyWebhookSignature } from '../utils/zoomAuth.js';

const router = express.Router();

/**
 * GET /api/webhooks/zoom
 * Simple endpoint check - Zoom may ping this during setup
 */
router.get('/', (req, res) => {
  console.log('📡 Zoom webhook endpoint accessed via GET');
  res.status(200).json({
    success: true,
    message: 'Zoom webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/webhooks/zoom
 * Receive webhook events from Zoom
 * Note: Raw body is already parsed by express.raw() in server.js
 */
router.post('/', async (req, res) => {
  try {
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    // 1. Handle URL validation FIRST
    if (event.event === 'endpoint.url_validation') {
      const hashForValidate = crypto
        .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(event.payload.plainToken)
        .digest('hex');
      
      return res.status(200).json({
        plainToken: event.payload.plainToken,
        encryptedToken: hashForValidate
      });
    }
    // For all other events, verify the webhook signature
    const signature = req.headers['x-zm-signature'];
    
    if (!signature) {
      console.error('❌ No signature header found');
      return res.status(401).json({ error: 'Missing signature' });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle different meeting events
    const { event: eventType, payload } = event;

    console.log('📬 Received Zoom webhook:', eventType);

    const meetingId = payload.object.id.toString();

    switch (eventType) {
      case 'meeting.started':
        await LiveClass.updateOne({ meetingId }, { status: 'live' });
        console.log('▶️ Meeting started:', meetingId);
        break;

      case 'meeting.ended':
        await LiveClass.updateOne({ meetingId }, { status: 'completed' });
        console.log('⏹️ Meeting ended:', meetingId);
        break;

      case 'meeting.deleted':
        await LiveClass.deleteOne({ meetingId });
        console.log('🗑️ Meeting deleted from Zoom:', meetingId);
        break;

      case 'meeting.created':
        try {
          // Check if already exists to prevent duplicates
          const exists = await LiveClass.findOne({ meetingId });
          if (exists) {
            console.log('⚠️ Meeting already exists (skipped sync):', meetingId);
            break;
          }

          const { topic, start_time, duration, join_url, password, host_email } = payload.object;
          
          await LiveClass.create({
            title: topic || 'New Zoom Meeting',
            description: 'Imported from Zoom App',
            platform: 'Zoom',
            link: join_url,
            scheduledAt: start_time ? new Date(start_time) : new Date(),
            duration: duration || 60,
            instructor: host_email || 'Zoom Host',
            status: 'scheduled',
            meetingId: meetingId,
            password: password || '',
            source: 'automated',
            zoomData: payload.object
          });
          console.log('✨ Meeting auto-synced from Zoom:', meetingId);
        } catch (err) {
          console.error('❌ Error syncing created meeting:', err);
        }
        break;

      default:
        console.log('📬 Received Zoom webhook:', event.event);
    }

    res.status(200).send();
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).send();
  }
});

export default router;