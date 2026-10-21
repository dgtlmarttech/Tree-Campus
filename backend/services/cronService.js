import cron from 'node-cron';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { sendCourseEnrollmentNudgeEmail, sendDailyLiveClassesEmail } from '../utils/zeptoEmail.js';

/**
 * Execute the Enrollment Nudge check for students registered in the last 30 days
 * who have not enrolled in any course yet.
 * Runs weekly: sends to unenrolled users who either haven't received a nudge yet,
 * OR received their last nudge at least 6 days ago (ensures at most 1 email per week).
 */
export const runWeeklyEnrollmentNudgeJob = async () => {
  console.log('⏰ [Cron] Starting weekly enrollment nudge job...');

  try {
    // 30 days registration rolling window
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // At least 6 days gap so they get at most 1 email per week
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);

    // 1. Get all user IDs with active enrollments
    const enrolledUserIds = await Enrollment.find().distinct('user');

    // 2. Find verified students registered in the last 30 days who haven't enrolled
    // and either never received a nudge or received last nudge >= 6 days ago
    const candidates = await User.find({
      role: 'student',
      isVerified: true,
      email: { $exists: true, $ne: '' },
      createdAt: { $gte: oneMonthAgo },
      _id: { $nin: enrolledUserIds },
      $or: [
        { enrolledCourses: { $exists: false } },
        { enrolledCourses: { $size: 0 } }
      ],
      $and: [
        {
          $or: [
            { enrollmentNudgeSent: { $ne: true } },
            { enrollmentNudgeSentAt: { $exists: false } },
            { enrollmentNudgeSentAt: { $lt: sixDaysAgo } }
          ]
        }
      ]
    });

    console.log(`🔍 [Cron] Found ${candidates.length} unenrolled students eligible for weekly nudge.`);

    if (candidates.length === 0) {
      console.log('✅ [Cron] No pending students to nudge this week.');
      return { total: 0, sent: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const student of candidates) {
      try {
        await sendCourseEnrollmentNudgeEmail(student.email, student.name);
        student.enrollmentNudgeSent = true;
        student.enrollmentNudgeSentAt = new Date();
        student.nudgeCount = (student.nudgeCount || 0) + 1;
        await student.save();
        sentCount++;

        // 200ms throttle between emails to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        failedCount++;
        console.error(`⚠️ [Cron] Failed sending nudge to ${student.email}:`, err.message);
      }
    }

    console.log(`✅ [Cron] Weekly enrollment nudge job completed. Successfully sent: ${sentCount}, Failed: ${failedCount}`);
    return { total: candidates.length, sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('❌ [Cron] Error running weekly enrollment nudge job:', error);
    throw error;
  }
};

/**
 * Execute Weekly Daily Live Classes Announcement for students registered in the last 30 days.
 * Informs them about the 3 recurring daily live Zoom classes (Hindi & Bengali).
 * Runs weekly: sends to students who either haven't received the announcement yet,
 * OR received their last announcement at least 6 days ago (ensures at most 1 email per week).
 */
export const runWeeklyLiveClassesAnnouncementJob = async () => {
  console.log('⏰ [Cron] Starting weekly 3 daily live classes announcement job...');

  try {
    // 30 days rolling registration window
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // 5 days gap prevents multiple emails in the same week, but guarantees
    // users who already received it in previous weeks WILL receive it again every week!
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Target: verified students registered within the last 30 days.
    // Includes users who have NOT received it yet, AS WELL AS users who received it in previous weeks.
    const candidates = await User.find({
      role: 'student',
      isVerified: true,
      email: { $exists: true, $ne: '' },
      createdAt: { $gte: oneMonthAgo },
      $or: [
        { liveClassNotificationSentAt: { $exists: false } },
        { liveClassNotificationSentAt: null },
        { liveClassNotificationSentAt: { $lt: fiveDaysAgo } }
      ]
    });

    console.log(`🔍 [Cron] Found ${candidates.length} students registered in last 30 days eligible for weekly live classes email.`);

    if (candidates.length === 0) {
      console.log('✅ [Cron] No pending students for weekly live classes email.');
      return { total: 0, sent: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const student of candidates) {
      try {
        await sendDailyLiveClassesEmail(student.email, student.name);
        student.liveClassNotificationSentAt = new Date();
        student.liveClassNotificationCount = (student.liveClassNotificationCount || 0) + 1;
        await student.save();
        sentCount++;

        // 200ms throttle between emails to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        failedCount++;
        console.error(`⚠️ [Cron] Failed sending live classes email to ${student.email}:`, err.message);
      }
    }

    console.log(`✅ [Cron] Weekly live classes announcement job completed. Successfully sent: ${sentCount}, Failed: ${failedCount}`);
    return { total: candidates.length, sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('❌ [Cron] Error running weekly live classes announcement job:', error);
    throw error;
  }
};

/**
 * Initialize all scheduled cron jobs
 * 1. Weekly Enrollment Nudge: Runs every Monday at 10:00 AM ('0 10 * * 1')
 * 2. Weekly 3 Daily Live Classes Announcement: Runs every Thursday at 10:00 AM ('0 10 * * 4')
 */
export const initCronJobs = () => {
  // Weekly Enrollment Nudge: Every Monday at 10:00 AM
  cron.schedule('0 10 * * 1', async () => {
    console.log('🔔 [Cron] Triggering scheduled Monday 10:00 AM Enrollment Nudge...');
    await runWeeklyEnrollmentNudgeJob();
  });

  // Weekly 3 Daily Live Classes Announcement: Every Thursday at 10:00 AM
  cron.schedule('0 10 * * 4', async () => {
    console.log('🔔 [Cron] Triggering scheduled Thursday 10:00 AM Daily Live Classes Announcement...');
    await runWeeklyLiveClassesAnnouncementJob();
  });

  console.log('📅 [Cron] Scheduled jobs initialized (Weekly Enrollment Nudge: Mondays 10 AM, Weekly 3 Live Classes: Thursdays 10 AM)');
};
