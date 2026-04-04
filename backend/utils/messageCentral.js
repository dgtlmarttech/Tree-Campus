import fetch from 'node-fetch';

const CUSTOMER_ID = (process.env.MESSAGE_CENTRAL_CUSTOMER_ID || '').trim();
const API_KEY = (process.env.MESSAGE_CENTRAL_KEY || '').trim();
const BASE_URL = (process.env.MESSAGE_CENTRAL_BASE_URL || 'https://cpaas.messagecentral.com').trim();
const COUNTRY_CODE = (process.env.MESSAGE_CENTRAL_COUNTRY_CODE || '91').trim();

/**
 * Get Authentication Token from Message Central
 */
const getAuthToken = async () => {
  try {
    const customerId = (process.env.MESSAGE_CENTRAL_CUSTOMER_ID || '').trim();
    const apiKey = (process.env.MESSAGE_CENTRAL_KEY || '').trim();
    const email = (process.env.MESSAGE_CENTRAL_EMAIL || '').trim();

    if (!customerId || !apiKey) {
      throw new Error('Message Central credentials (CUSTOMER_ID or KEY) are missing in .env');
    }

    const params = new URLSearchParams({
      customerId: customerId,
      key: apiKey,
      scope: 'NEW'
    });
    if (email) params.append('email', email);

    const url = `${BASE_URL}/auth/v1/authentication/token?${params.toString()}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();

    if (data && data.token) {
      return data.token;
    }
    if (data && data.data && data.data.token) {
      return data.data.token;
    }

    console.error('❌ Message Central Auth Token Error - Full Response:', JSON.stringify(data));
    throw new Error(data.error || data.message || 'Failed to get Message Central token');
  } catch (error) {
    console.error('❌ Message Central Auth Token Error:', error.message);
    throw error;
  }
};

/**
 * Send SMS OTP
 * @param {string} mobileNumber 10-digit mobile number
 */
export const sendSMSOTP = async (mobileNumber) => {
  try {
    const authToken = await getAuthToken();
    const url = `${BASE_URL}/verification/v3/send`;
    
    // We pass params in the query string as before
    const params = new URLSearchParams({
      countryCode: COUNTRY_CODE,
      customerId: CUSTOMER_ID,
      flowType: 'SMS',
      mobileNumber: mobileNumber,
      otpLength: '6',
    });

    console.log(`🚀 [DEBUG] Sending SMS OTP to ${mobileNumber} via Message Central v3...`);
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'authToken': authToken,
      }
    });

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('❌ Failed to parse Message Central response:', text);
        throw new Error('Our SMS service returned an invalid response. Please try again later.');
      }
    } else {
      throw new Error(`SMS service connection failed (Status: ${response.status}). Please try again.`);
    }

    if (data && (data.responseCode === 200 || data.status === 200) && data.data) {
      console.log(`📱 [DEBUG] SMS OTP request successful. Mobile: ${mobileNumber}, VerificationId: ${data.data.verificationId}`);
      return {
        success: true,
        verificationId: data.data.verificationId,
        message: 'OTP sent via SMS'
      };
    }
    
    console.error('❌ Message Central Send SMS Failure:', JSON.stringify(data, null, 2));
    throw new Error(data.message || data.error || 'The SMS service could not send the code right now.');
  } catch (error) {
    console.error('❌ Send SMS OTP Error:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Validate SMS OTP
 * @param {string} verificationId The ID returned by sendOtp
 * @param {string} otp The 6-digit OTP entered by user
 */
export const validateOTP = async (verificationId, otp) => {
  try {
    const authToken = await getAuthToken();
    // Using v3 validation with GET method
    const url = `${BASE_URL}/verification/v3/validateOtp`;
    
    const params = new URLSearchParams({
        countryCode: COUNTRY_CODE,
        verificationId: verificationId,
        customerId: CUSTOMER_ID,
        code: otp,
    });

    console.log(`🔍 [DEBUG] Validating SMS OTP for VerificationID: ${verificationId}...`);
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET', // Changed from POST to GET
      headers: {
        'authToken': authToken,
      }
    });

    console.log(`📡 [DEBUG] MC Validation Status: ${response.status} ${response.statusText}`);

    const text = await response.text();
    console.log(`📡 [DEBUG] MC Validation Raw Response: ${text}`);

    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ Failed to parse validation response:', text);
        }
    }

    if (data && (data.responseCode === 200 || data.status === 200)) {
      console.log(`✅ [DEBUG] SMS OTP validated successfully.`);
      return {
        success: true,
        message: 'OTP validated successfully'
      };
    }
    
    console.error('❌ Validation Failed Response:', JSON.stringify(data, null, 2));
    throw new Error(data.message || data.error || 'Invalid or expired OTP');
  } catch (error) {
    console.error('❌ Validate SMS OTP Error:', error.message);
    throw error;
  }
};
