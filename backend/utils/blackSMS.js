import fetch from 'node-fetch';

const getBlackSMSConfig = () => {
  const url = (process.env.BLACK_SMS_URL || 'https://blacksms.in/sms').trim();
  const authKey = (process.env.BLACK_SMS_AUTH_KEY || '').trim();
  const senderId = (process.env.BLACK_SMS_SENDER_ID || '').trim();
  const route = (process.env.BLACK_SMS_ROUTE || '1').trim();

  if (!authKey || !senderId) {
    throw new Error('Black SMS credentials (BLACK_SMS_AUTH_KEY or BLACK_SMS_SENDER_ID) are missing in .env');
  }

  return { url, authKey, senderId, route };
};

/**
 * Send SMS OTP via Black SMS Gateway
 * @param {string} mobileNumber 10-digit mobile number
 * @param {string} otp 6-digit OTP code
 */
export const sendBlackSMSOTP = async (mobileNumber, otp) => {
  try {
    const { url, authKey, senderId, route } = getBlackSMSConfig();

    if (!mobileNumber) {
      throw new Error('Mobile number is required for SMS');
    }
    if (!otp) {
      throw new Error('OTP is required');
    }

    // Clean number: ensure 10-digit number without non-digit characters
    let cleanNumber = mobileNumber.toString().replace(/\D/g, '');
    if (cleanNumber.length > 10 && cleanNumber.startsWith('91')) {
      cleanNumber = cleanNumber.slice(-10);
    }

    const maskedNumber = cleanNumber.length >= 4 
      ? `${cleanNumber.slice(0, 2)}******${cleanNumber.slice(-2)}` 
      : '***';
    console.log(`🚀 [BlackSMS] Sending SMS OTP to ${maskedNumber}...`);

    const payload = {
      sender_id: senderId,
      route: route,
      variables_values: otp.toString(),
      numbers: cleanNumber
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log(`📡 [BlackSMS] Response status: ${response.status}, body: ${text}`);

    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }
    }

    // Check if status is ok (200-299)
    if (!response.ok) {
      throw new Error(data.message || data.error || `Black SMS failed with status ${response.status}`);
    }

    return {
      success: true,
      message: 'OTP sent via Black SMS successfully',
      data
    };
  } catch (error) {
    console.error('❌ Black SMS Error:', error.message);
    throw error;
  }
};

export default {
  sendBlackSMSOTP
};
