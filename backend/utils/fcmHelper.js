import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath) {
  try {
    initializeApp({
      credential: cert(path.resolve(serviceAccountPath))
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  console.warn('FIREBASE_SERVICE_ACCOUNT_PATH is not defined. FCM notifications will be disabled.');
}

export const sendFCMNotification = async (tokens, title, body, data = {}) => {
  const apps = getApps();
  if (!apps || !apps.length) {
    console.warn('Firebase Admin not initialized, skipping notification.');
    return;
  }

  const message = {
    notification: {
      title,
      body
    },
    data: {
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    tokens: Array.isArray(tokens) ? tokens : [tokens]
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(response.successCount + ' messages were sent successfully');
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error('Failed to send to token:', message.tokens[idx], resp.error);
        }
      });
    }
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};
