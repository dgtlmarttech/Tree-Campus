import cron from 'node-cron';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Certificate from '../models/Certificate.js';
import { sendCourseEnrollmentNudgeEmail, sendDailyLiveClassesEmail, sendCertificateExamReminderEmail } from '../utils/zeptoEmail.js';

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

export const runWeeklyCertificateExamReminderJob = async () => {
  console.log('⏰ [Cron] Starting weekly certificate exam reminder job...');

  try {
    const now = new Date();
    const registrationCutoff = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    const enrollmentCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleClaimCutoff = new Date(now.getTime() - 30 * 60 * 1000);

    const candidates = await User.find({
      role: 'student',
      isVerified: true,
      email: { $exists: true, $ne: '' },
      createdAt: { $gte: registrationCutoff },
      $or: [
        { certificateExamReminderSentAt: { $exists: false } },
        { certificateExamReminderSentAt: null },
        { certificateExamReminderSentAt: { $lte: sentCutoff } }
      ]
    }).select('name email createdAt enrolledCourses');

    if (candidates.length === 0) {
      console.log('✅ [Cron] No recent students need a certificate exam reminder.');
      return { eligible: 0, sent: 0, failed: 0 };
    }

    const candidateIds = candidates.map((student) => student._id);
    const enrollments = await Enrollment.find({ user: { $in: candidateIds } })
      .select('user course enrolledAt');
    const courseIds = new Set();
    candidates.forEach((student) => {
      student.enrolledCourses.forEach((enrollment) => {
        if (enrollment.courseId) courseIds.add(String(enrollment.courseId));
      });
    });
    enrollments.forEach((enrollment) => courseIds.add(String(enrollment.course)));

    if (courseIds.size === 0) {
      console.log('✅ [Cron] No enrolled courses found for recent students.');
      return { eligible: 0, sent: 0, failed: 0 };
    }

    const assignments = await Assignment.find({
      courseId: { $in: [...courseIds] }
    })
      .populate('courseId', 'title certificateTitle')
      .sort({ createdAt: 1 })
      .select('courseId');
    if (assignments.length === 0) {
      console.log('✅ [Cron] No certificate exams found for recent students.');
      return { eligible: 0, sent: 0, failed: 0 };
    }

    const assignmentIds = assignments.map((assignment) => assignment._id);
    const courseIdList = [...courseIds];
    const [submissions, certificates] = await Promise.all([
      AssignmentSubmission.find({
        userId: { $in: candidateIds },
        assignmentId: { $in: assignmentIds }
      }).select('userId assignmentId passed submittedAt'),
      Certificate.find({
        userId: { $in: candidateIds },
        courseId: { $in: courseIdList }
      }).select('userId courseId')
    ]);

    const toId = (value) => String(value?._id || value || '');
    const enrollmentByUserCourse = new Map();
    enrollments.forEach((enrollment) => {
      enrollmentByUserCourse.set(
        `${toId(enrollment.user)}:${toId(enrollment.course)}`,
        enrollment
      );
    });

    const assignmentsByCourse = new Map();
    assignments.forEach((assignment) => {
      const courseId = toId(assignment.courseId);
      const courseAssignments = assignmentsByCourse.get(courseId) || [];
      courseAssignments.push(assignment);
      assignmentsByCourse.set(courseId, courseAssignments);
    });

    const submissionsByUserAssignment = new Map();
    submissions.forEach((submission) => {
      const key = `${toId(submission.userId)}:${toId(submission.assignmentId)}`;
      const entries = submissionsByUserAssignment.get(key) || [];
      entries.push(submission);
      submissionsByUserAssignment.set(key, entries);
    });
    submissionsByUserAssignment.forEach((entries) => {
      entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    });

    const certificateKeys = new Set(
      certificates.map((certificate) => `${toId(certificate.userId)}:${toId(certificate.courseId)}`)
    );
    const enrollmentsByUser = new Map();
    enrollments.forEach((enrollment) => {
      const userId = toId(enrollment.user);
      const userEnrollments = enrollmentsByUser.get(userId) || [];
      userEnrollments.push(enrollment);
      enrollmentsByUser.set(userId, userEnrollments);
    });

    let eligibleCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    for (const student of candidates) {
      const studentId = toId(student._id);
      const studentCourses = new Map();

      student.enrolledCourses.forEach((enrollment) => {
        const courseId = toId(enrollment.courseId);
        if (courseId) studentCourses.set(courseId, enrollment);
      });
      (enrollmentsByUser.get(studentId) || [])
        .forEach((enrollment) => {
          const courseId = toId(enrollment.course);
          if (!studentCourses.has(courseId)) {
            studentCourses.set(courseId, { courseId: enrollment.course, enrolledAt: enrollment.enrolledAt });
          }
        });

      const reminders = [];
      for (const [courseId, userEnrollment] of studentCourses) {
        const storedEnrollment = enrollmentByUserCourse.get(`${studentId}:${courseId}`);
        const enrolledAt = storedEnrollment?.enrolledAt || userEnrollment.enrolledAt || student.createdAt;
        if (new Date(enrolledAt) > enrollmentCutoff) continue;

        if (certificateKeys.has(`${studentId}:${courseId}`)) continue;

        const courseAssignments = assignmentsByCourse.get(courseId) || [];
        for (const assignment of courseAssignments) {
          const submissionList = submissionsByUserAssignment.get(`${studentId}:${toId(assignment._id)}`) || [];
          if (submissionList.some((submission) => submission.passed) || submissionList.length >= 3) continue;

          const course = assignment.courseId;
          reminders.push({
            courseTitle: course?.certificateTitle || course?.title || 'your course',
            courseId,
            assignmentId: assignment._id,
            hasAttempted: submissionList.length > 0,
            remainingAttempts: 3 - submissionList.length
          });
        }
      }

      if (reminders.length === 0) continue;
      eligibleCount++;

      const claim = await User.findOneAndUpdate(
        {
          _id: student._id,
          $and: [
            {
              $or: [
                { certificateExamReminderSentAt: { $exists: false } },
                { certificateExamReminderSentAt: null },
                { certificateExamReminderSentAt: { $lte: sentCutoff } }
              ]
            },
            {
              $or: [
                { certificateExamReminderClaimedAt: { $exists: false } },
                { certificateExamReminderClaimedAt: null },
                { certificateExamReminderClaimedAt: { $lte: staleClaimCutoff } }
              ]
            }
          ]
        },
        { $set: { certificateExamReminderClaimedAt: now } },
        { new: true }
      ).select('_id');
      if (!claim) continue;

      try {
        await sendCertificateExamReminderEmail(student.email, student.name, reminders);
        await User.updateOne(
          { _id: student._id, certificateExamReminderClaimedAt: now },
          {
            $set: { certificateExamReminderSentAt: now },
            $inc: { certificateExamReminderCount: 1 },
            $unset: { certificateExamReminderClaimedAt: '' }
          }
        );
        sentCount++;
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        try {
          await User.updateOne(
            { _id: student._id, certificateExamReminderClaimedAt: now },
            { $unset: { certificateExamReminderClaimedAt: '' } }
          );
        } catch (releaseError) {
          console.error(`⚠️ [Cron] Failed releasing reminder claim for ${student.email}:`, releaseError.message);
        }
        failedCount++;
        console.error(`⚠️ [Cron] Failed sending certificate exam reminder to ${student.email}:`, error.message);
      }
    }

    console.log(`✅ [Cron] Certificate exam reminders complete. Eligible: ${eligibleCount}, Sent: ${sentCount}, Failed: ${failedCount}`);
    return { eligible: eligibleCount, sent: sentCount, failed: failedCount };
  } catch (error) {
    console.error('❌ [Cron] Error running certificate exam reminder job:', error);
    throw error;
  }
};

/**
 * Initialize all scheduled cron jobs
 * 1. Weekly Enrollment Nudge: Runs every Monday at 10:00 AM Asia/Kolkata time
 * 2. Weekly Daily Live Classes Announcement: Runs every Monday at 11:00 AM Asia/Kolkata time
 * 3. Weekly Certificate Exam Reminder: Runs every Monday at 12:00 PM Asia/Kolkata time
 */
export const initCronJobs = () => {
  // Weekly Enrollment Nudge: Every Monday at 10:00 AM IST
  cron.schedule('0 10 * * 1', async () => {
    console.log('🔔 [Cron] Triggering scheduled Monday 10:00 AM Enrollment Nudge...');
    await runWeeklyEnrollmentNudgeJob();
  }, { timezone: 'Asia/Kolkata' });

  // Weekly Daily Live Classes Announcement: Every Monday at 11:00 AM IST
  cron.schedule('0 11 * * 1', async () => {
    console.log('🔔 [Cron] Triggering scheduled Monday 11:00 AM Daily Live Classes Announcement...');
    await runWeeklyLiveClassesAnnouncementJob();
  }, { timezone: 'Asia/Kolkata' });

  cron.schedule('0 12 * * 1', async () => {
    console.log('🔔 [Cron] Triggering scheduled Monday 12:00 PM IST Certificate Exam Reminder...');
    await runWeeklyCertificateExamReminderJob();
  }, { timezone: 'Asia/Kolkata' });

  console.log('📅 [Cron] Scheduled jobs initialized (Enrollment Nudge: Mondays 10 AM IST, Live Classes: Mondays 11 AM IST, Certificate Exam Reminder: Mondays 12 PM IST)');
};
