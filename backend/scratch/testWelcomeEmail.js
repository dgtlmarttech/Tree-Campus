import 'dotenv/config';
import { sendWelcomeEmail } from '../utils/zeptoEmail.js';

async function test() {
  const testEmail = process.env.ADMIN_EMAIL || 'vishx998@gmail.com';
  console.log(`🚀 Sending test Welcome Email to ${testEmail}...`);

  try {
    const res = await sendWelcomeEmail(testEmail, 'Vishal');
    console.log('✅ Response:', res);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

test();
