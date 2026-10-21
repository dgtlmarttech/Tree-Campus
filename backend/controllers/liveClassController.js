import LiveClass from '../models/LiveClass.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendFCMNotification } from '../utils/fcmHelper.js';
import { zoomApiRequest, generateSDKSignature } from '../utils/zoomAuth.js';
import { v4 as uuidv4 } from 'uuid';
import Enrollment from '../models/Enrollment.js';
import { sendDailyLiveClassesEmail } from '../utils/zeptoEmail.js';

const MAX_CONCURRENT_MEETINGS = 5;

// Helper to dynamically convert Zoom join URLs to Web Client URLs
const convertToWebClientLink = (link) => {
  if (link && link.includes('/j/')) {
    return link.replace('/j/', '/wc/join/');
  }
  return link;
};

// @desc    Get all live classes
// @route   GET /api/live-classes
// @access  Public
export const getLiveClasses = async (req, res) => {
  try {
    const liveClasses = await LiveClass.find()
      .populate('courseId', 'title thumbnail')
      .sort('scheduledAt');

    const modifiedClasses = liveClasses.map(lc => {
      const classObj = lc.toObject();
      if (classObj.platform === 'Zoom' && classObj.link) {
        classObj.link = convertToWebClientLink(classObj.link);
      }
      return classObj;
    });

    res.status(200).json({
      success: true,
      count: modifiedClasses.length,
      data: modifiedClasses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single live class
// @route   GET /api/live-classes/:id
// @access  Public
export const getLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id)
      .populate('courseId', 'title thumbnail');

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    const classObj = liveClass.toObject();
    if (classObj.platform === 'Zoom' && classObj.link) {
      classObj.link = convertToWebClientLink(classObj.link);
    }

    res.status(200).json({
      success: true,
      data: classObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create live class
// @route   POST /api/live-classes
// @access  Private/Admin
export const createLiveClass = async (req, res) => {
  try {
    const { title, description, platform, scheduledAt, duration, instructor, autoGenerateZoom, isRecurring, recurrenceEndDate } = req.body;

    // Helper to create a single class instance
    const createSingleClass = async (date, sid = null) => {
      // Check concurrent meetings limit
      if (platform === 'Zoom' && autoGenerateZoom) {
        const liveMeetingsCount = await LiveClass.countDocuments({ status: 'live' });
        if (liveMeetingsCount >= MAX_CONCURRENT_MEETINGS) {
          throw new Error(`Cannot create meeting. Maximum of ${MAX_CONCURRENT_MEETINGS} concurrent live meetings reached.`);
        }
      }

      let zoomMeetingData = {};
      let meetingLink = req.body.link;

      if (platform === 'Zoom' && (autoGenerateZoom === true || autoGenerateZoom === 'true')) {
        const zoomMeeting = await zoomApiRequest('/users/me/meetings', 'POST', {
          topic: title,
          type: 2,
          start_time: new Date(date).toISOString(),
          duration: parseInt(duration) || 60,
          password: Math.random().toString(36).substring(2, 8),
          settings: {
            host_video: false,
            participant_video: false,
            join_before_host: true,
            waiting_room: false
          }
        });

        if (!zoomMeeting || !zoomMeeting.join_url) {
          throw new Error('Failed to generate Zoom meeting: No join URL returned from Zoom API');
        }

        meetingLink = zoomMeeting.join_url;
        zoomMeetingData = {
          meetingId: zoomMeeting.id.toString(),
          password: zoomMeeting.password,
          hostEmail: zoomMeeting.host_email,
          hostName: zoomMeeting.topic,
          zoomData: zoomMeeting,
          source: 'automated'
        };
      }

      return await LiveClass.create({
        ...req.body,
        scheduledAt: date,
        link: meetingLink,
        seriesId: sid,
        ...zoomMeetingData
      });
    };

    const createdClasses = [];

    if (isRecurring && recurrenceEndDate) {
      const startDate = new Date(scheduledAt);
      const endDate = new Date(recurrenceEndDate);
      
      // FIX: Ensure end date includes the entire day (up to 23:59:59)
      // This ensures that if a class is at 10:00 PM on the end date, it is still created.
      endDate.setHours(23, 59, 59, 999);
      
      const seriesId = uuidv4();

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
         return res.status(400).json({ success: false, message: 'Invalid start or end date' });
      }

      if (endDate < startDate) {
        return res.status(400).json({ success: false, message: 'End date must be after start date' });
      }

      // Loop through dates
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Create class for this date
        // Note: Creating classes sequentially to avoid rate limits or race conditions
        const newClass = await createSingleClass(new Date(d), seriesId);
        createdClasses.push(newClass);
      }
    } else {
      // Single class creation
      const newClass = await createSingleClass(scheduledAt);
      createdClasses.push(newClass);
    }

      // Send Notifications to all users (In-App) and FCM tokens (Push)
      try {
        const allUsers = await User.find({}).select('_id fcmToken');
        const tokens = allUsers.map(u => u.fcmToken).filter(t => t != null && t !== '');
        
        if (allUsers.length > 0) {
          const mainClass = (isRecurring || createdClasses.length > 1) ? createdClasses[0] : createdClasses[0];
          
          const notifTitle = "New Live Class: " + mainClass.title;
          const notifBody = "Join the upcoming live class at " + new Date(mainClass.scheduledAt).toLocaleString();
          const notifData = {
            type: 'live_class',
            route: '/live-classes',
            referenceId: mainClass._id.toString()
          };

          // Save In-App Notifications to DB for ALL users
          const notificationsToSave = allUsers.map(u => ({
            userId: u._id,
            title: notifTitle,
            body: notifBody,
            type: notifData.type,
            route: notifData.route,
            referenceId: notifData.referenceId
          }));
          
          await Notification.insertMany(notificationsToSave);
          
          // Send Push Notifications ONLY to users with FCM tokens
          if (tokens.length > 0) {
            await sendFCMNotification(tokens, notifTitle, notifBody, notifData);
          }
        }
      } catch (notifErr) {
        console.error('Failed to send notifications for live class:', notifErr);
      }

      res.status(201).json({
      success: true,
      count: createdClasses.length,
      data: (isRecurring || createdClasses.length > 1) ? createdClasses : createdClasses[0]
    });

  } catch (error) {
    console.error('Error creating live class:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update live class
// @route   PUT /api/live-classes/:id
// @access  Private/Admin
export const updateLiveClass = async (req, res) => {
  try {
    const { updateSeries } = req.body;
    const oldClass = await LiveClass.findById(req.params.id);

    if (!oldClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Single class update
    if (!updateSeries || !oldClass.seriesId) {
      const liveClass = await LiveClass.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );
      return res.status(200).json({
        success: true,
        data: liveClass
      });
    }

    // Series update
    const oldDate = new Date(oldClass.scheduledAt);
    const newDate = new Date(req.body.scheduledAt || oldClass.scheduledAt);
    const timeDiff = newDate.getTime() - oldDate.getTime();

    // Find all future classes in the series (including this one)
    const seriesClasses = await LiveClass.find({
      seriesId: oldClass.seriesId,
      scheduledAt: { $gte: oldDate }
    });

    const updatedClasses = [];
    for (const lc of seriesClasses) {
      const currentScheduledAt = new Date(lc.scheduledAt);
      const updatedScheduledAt = new Date(currentScheduledAt.getTime() + timeDiff);

      // Prepare update data (keeping everything except ID and special fields)
      const updateData = { ...req.body };
      delete updateData._id;
      delete updateData.seriesId;
      updateData.scheduledAt = updatedScheduledAt;

      // Update in Zoom if it's an automated Zoom meeting
      if (lc.source === 'automated' && lc.meetingId) {
        try {
          await zoomApiRequest(`/meetings/${lc.meetingId}`, 'PATCH', {
            topic: req.body.title || lc.title,
            start_time: updatedScheduledAt.toISOString(),
            duration: req.body.duration || lc.duration
          });
        } catch (zoomError) {
          console.error(`Failed to update Zoom meeting ${lc.meetingId}:`, zoomError.message);
        }
      }

      const updated = await LiveClass.findByIdAndUpdate(
        lc._id,
        updateData,
        { new: true, runValidators: true }
      );
      updatedClasses.push(updated);
    }

    res.status(200).json({
      success: true,
      count: updatedClasses.length,
      data: updatedClasses.find(c => c._id.toString() === req.params.id) // Return the edited instance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete live class
// @route   DELETE /api/live-classes/:id
// @access  Private/Admin
export const deleteLiveClass = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Delete from Zoom if automated
    if (liveClass.source === 'automated' && liveClass.meetingId) {
      try {
        await zoomApiRequest(`/meetings/${liveClass.meetingId}`, 'DELETE');
      } catch (zoomError) {
        if (zoomError.response?.status === 404) {
           console.log(`ℹ️ Meeting ${liveClass.meetingId} already deleted from Zoom.`);
        } else {
           console.error('Error deleting from Zoom:', zoomError.message);
        }
      }
    }

    await liveClass.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Live class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete entire live class series
// @route   DELETE /api/live-classes/series/:seriesId
// @access  Private/Admin
export const deleteLiveClassSeries = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const liveClasses = await LiveClass.find({ seriesId });

    if (!liveClasses || liveClasses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Live class series not found'
      });
    }

    // Delete from Zoom for each automated meeting in the series
    for (const lc of liveClasses) {
      if (lc.source === 'automated' && lc.meetingId) {
        try {
          await zoomApiRequest(`/meetings/${lc.meetingId}`, 'DELETE');
        } catch (error) {
          console.error(`Error deleting meeting ${lc.meetingId} from Zoom:`, error.message);
        }
      }
    }

    await LiveClass.deleteMany({ seriesId });

    res.status(200).json({
      success: true,
      message: `Deleted ${liveClasses.length} classes in the series`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get Zoom SDK Signature
// @route   POST /api/live-classes/:id/signature
// @access  Private
export const getMeetingSignature = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);

    if (!liveClass || !liveClass.meetingId) {
      return res.status(404).json({
        success: false,
        message: 'Live class or Zoom meeting not found'
      });
    }

    const { role = 0 } = req.body; // 0 for participant, 1 for host (admin)
    const signature = generateSDKSignature(liveClass.meetingId, role);

    res.status(200).json({
      success: true,
      data: {
        signature,
        meetingNumber: liveClass.meetingId,
        password: liveClass.password,
        sdkKey: process.env.ZOOM_SDK_KEY,
        userName: req.user ? req.user.name : 'Student'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Background task to update meeting statuses based on scheduled time
 */
async function updateMeetingStatuses() {
  try {
    const now = new Date();
    // Classes that are scheduled but should be live (auto-start based on schedule)
    await LiveClass.updateMany(
      { 
        status: 'scheduled', 
        scheduledAt: { $lte: now } 
      },
      { status: 'live' }
    );

    // Classes that are live but should be completed
    const meetings = await LiveClass.find({ status: 'live' });
    for (const mc of meetings) {
      if (mc.scheduledAt) {
        const endTime = new Date(mc.scheduledAt.getTime() + (mc.duration || 60) * 60000);
        if (now > endTime) {
          console.log(`⏹️ Timer: Marking meeting ${mc._id} as completed. EndTime: ${endTime.toISOString()}, Now: ${now.toISOString()}`);
          mc.status = 'completed';
          await mc.save();
        } else {
          // Debug: Log if it's close or if there's a status mismatch
          console.log(`ℹ️ Timer: Meeting ${mc._id} is still live. EndTime: ${endTime.toISOString()}, Now: ${now.toISOString()}`);
        }
      }
    }
  } catch (error) {
    console.error('Error updating meeting statuses:', error.message);
  }
}

// Run status update every minute
setInterval(updateMeetingStatuses, 60000);

// @desc    Send email notification for an upcoming live class to students
// @route   POST /api/live-classes/:id/notify-email
// @access  Private/Admin
export const notifyLiveClassStudents = async (req, res) => {
  try {
    const liveClass = await LiveClass.findById(req.params.id);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    let targetStudents = [];
    if (liveClass.courseId) {
      const enrolledUserIds = await Enrollment.find({ course: liveClass.courseId }).distinct('user');
      targetStudents = await User.find({
        role: 'student',
        isVerified: true,
        email: { $exists: true, $ne: '' },
        $or: [
          { _id: { $in: enrolledUserIds } },
          { 'enrolledCourses.courseId': liveClass.courseId }
        ]
      }).select('name email');
    }

    if (targetStudents.length === 0) {
      targetStudents = await User.find({
        role: 'student',
        isVerified: true,
        email: { $exists: true, $ne: '' }
      }).limit(100).select('name email');
    }

    if (targetStudents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No eligible students with email found for this class',
        sentCount: 0
      });
    }

    let sentCount = 0;
    const errors = [];

    for (const student of targetStudents) {
      try {
        await sendDailyLiveClassesEmail(student.email, student.name);
        sentCount++;
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        errors.push({ studentId: student._id, email: student.email, error: err.message });
      }
    }

    liveClass.emailNotificationSent = true;
    liveClass.emailNotificationSentAt = new Date();
    await liveClass.save();

    res.status(200).json({
      success: true,
      message: `Successfully sent 3 daily live classes schedule email to ${sentCount} students`,
      sentCount,
      errorsCount: errors.length
    });
  } catch (error) {
    console.error('Error in notifyLiveClassStudents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Broadcast 3 Daily Live Classes Announcement to students registered in the last 30 days
// @route   POST /api/live-classes/broadcast-schedule
// @access  Private/Admin
export const broadcastLiveClassesSchedule = async (req, res) => {
  try {
    const { dryRun = false } = req.body;
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Target all students registered in the last 30 days (including those who received it previously)
    const candidates = await User.find({
      role: 'student',
      isVerified: true,
      email: { $exists: true, $ne: '' },
      createdAt: { $gte: oneMonthAgo }
    }).select('name email liveClassNotificationCount');

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        eligibleCount: candidates.length,
        message: `Found ${candidates.length} students registered in the last 30 days eligible for the 3 daily live classes announcement.`
      });
    }

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        sentCount: 0,
        message: 'No eligible students found in the 30-day window to send the announcement to.'
      });
    }

    let sentCount = 0;
    const errors = [];

    for (const student of candidates) {
      try {
        await sendDailyLiveClassesEmail(student.email, student.name);
        student.liveClassNotificationSentAt = new Date();
        student.liveClassNotificationCount = (student.liveClassNotificationCount || 0) + 1;
        await student.save();
        sentCount++;
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err) {
        errors.push({ studentId: student._id, email: student.email, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      totalEligible: candidates.length,
      sentCount,
      errorsCount: errors.length,
      message: `Successfully broadcasted 3 daily live classes email to ${sentCount} students.`
    });
  } catch (error) {
    console.error('Error in broadcastLiveClassesSchedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


