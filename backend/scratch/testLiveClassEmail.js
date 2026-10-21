import 'dotenv/config';
import { sendDailyLiveClassesEmail } from '../utils/zeptoEmail.js';

async function test() {
  const testEmail = process.env.ADMIN_EMAIL || 'vishx998@gmail.com';
  console.log(`🚀 Sending test 3 Daily Free Live Zoom Classes Announcement Email to ${testEmail}...`);

  try {
    const res = await sendDailyLiveClassesEmail(testEmail, 'Vishal');
    console.log('✅ Response:', res);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

test();
