import 'dotenv/config';
import { sendCourseEnrollmentNudgeEmail } from '../utils/zeptoEmail.js';

async function test() {
  const testEmail = process.env.ADMIN_EMAIL || 'vishx998@gmail.com';
  console.log(`🚀 Sending test Course Enrollment Nudge Email to ${testEmail}...`);

  try {
    const res = await sendCourseEnrollmentNudgeEmail(testEmail, 'Vishal');
    console.log('✅ Response:', res);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

test();
