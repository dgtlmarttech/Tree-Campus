import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import TeacherApplication from '../models/TeacherApplication.js';
// import * as messageCentral from '../utils/messageCentral.js'; // Commented out - replaced by Black SMS
import { sendBlackSMSOTP } from '../utils/blackSMS.js';
import {
  sendTeacherApplicationConfirmation,
  sendTeacherStatusUpdate
} from '../utils/sendEmail.js';

/**
 * Helper to upload a buffer to Cloudinary
 */
const uploadToCloudinary = (fileBuffer, folder, resourceType, fileName) => {
  return new Promise((resolve, reject) => {
    const extIndex = fileName.lastIndexOf('.');
    const baseName = extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;
    const extension = extIndex !== -1 ? fileName.substring(extIndex) : '';
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const publicId = `${cleanBaseName}-${Date.now()}${extension}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
        public_id: publicId
      },
      (error, result) => {
        if (error) {
          console.error(`❌ Cloudinary upload failed for ${fileName}:`, error);
          return reject(error);
        }
        resolve(result);
      }
    );
    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

// @desc    Apply as a teacher (Submit details + upload files + trigger OTP)
// @route   POST /api/teachers/apply
// @access  Public
export const applyTeacher = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone number are required.'
      });
    }

    if (!req.files || !req.files.resume || !req.files.demoVideo) {
      return res.status(400).json({
        success: false,
        message: 'Both resume (PDF/Word/Image) and 1-minute demo video are required.'
      });
    }

    const resumeFile = req.files.resume[0];
    const videoFile = req.files.demoVideo[0];

    // Check if an application already exists
    const existingApp = await TeacherApplication.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingApp) {
      if (existingApp.isPhoneVerified) {
        return res.status(400).json({
          success: false,
          message: 'An application with this email or phone number has already been submitted and verified.'
        });
      } else {
        // Clean up previous unverified submission assets
        try {
          if (existingApp.resumePublicId) {
            await cloudinary.uploader.destroy(existingApp.resumePublicId, { 
              resource_type: existingApp.resumeResourceType || 'raw' 
            });
          }
          if (existingApp.demoVideoPublicId) {
            await cloudinary.uploader.destroy(existingApp.demoVideoPublicId, { resource_type: 'video' });
          }
        } catch (err) {
          console.error('⚠️ Failed to clean up older unverified assets:', err.message);
        }
        await existingApp.deleteOne();
      }
    }

    const resumeResourceType = 'auto';

    console.log(`📂 Uploading resume (${resumeFile.originalname}) as auto and video (${videoFile.originalname}) to Cloudinary...`);

    // 1. Upload Resume as appropriate format
    const resumeUpload = await uploadToCloudinary(
      resumeFile.buffer,
      'treecampus/teacher_applications/resumes',
      resumeResourceType,
      resumeFile.originalname
    );

    // 2. Upload Demo Video as video format
    const videoUpload = await uploadToCloudinary(
      videoFile.buffer,
      'treecampus/teacher_applications/demo_videos',
      'video',
      videoFile.originalname
    );

    // 3. Create Teacher Application record (isPhoneVerified is initially false)
    const application = await TeacherApplication.create({
      name,
      email,
      phone,
      resume: resumeUpload.secure_url,
      resumePublicId: resumeUpload.public_id,
      resumeResourceType: resumeUpload.resource_type,
      demoVideo: videoUpload.secure_url,
      demoVideoPublicId: videoUpload.public_id,
      isPhoneVerified: false
    });

    console.log(`📱 Triggering SMS OTP for phone: ${phone} via Message Central...`);

    // 4. Trigger Black SMS OTP
    let otpSent = true;
    let verificationId = '';
    let otpError = null;

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    application.otp = generatedOtp;
    application.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 mins

    /* --- MESSAGE CENTRAL (COMMENTED OUT) ---
    try {
      const mcResponse = await messageCentral.sendSMSOTP(phone);
      if (mcResponse && mcResponse.success) {
        verificationId = mcResponse.verificationId;
      } else {
        throw new Error('Message Central failed to deliver OTP.');
      }
    } catch (err) {
      console.error('❌ Message Central OTP Trigger Error:', err.message);
      otpSent = false;
      otpError = err.message;
    }
    ---------------------------------------- */

    // --- BLACK SMS INTEGRATION ---
    try {
      await sendBlackSMSOTP(phone, generatedOtp);
    } catch (err) {
      console.error('❌ Black SMS OTP Trigger Error:', err.message);
      otpSent = false;
      otpError = err.message;
    }

    if (!otpSent) {
      // Clean up uploads since OTP trigger failed
      try {
        await cloudinary.uploader.destroy(resumeUpload.public_id, { resource_type: resumeUpload.resource_type });
        await cloudinary.uploader.destroy(videoUpload.public_id, { resource_type: 'video' });
        await application.deleteOne();
      } catch (cleanupErr) {
        console.error('⚠️ Post-failure Cloudinary clean up error:', cleanupErr.message);
      }
      return res.status(500).json({
        success: false,
        message: `Failed to trigger phone verification: ${otpError}. Please check your phone number and try again.`
      });
    }

    // Save transaction verificationId to the document
    application.verificationId = verificationId;
    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application files uploaded successfully. Please verify your phone number with the OTP code sent via SMS.',
      applicationId: application._id
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Verify SMS OTP to activate application
// @route   POST /api/teachers/verify-otp
// @access  Public
export const verifyTeacherOTP = async (req, res, next) => {
  try {
    const { applicationId, otp } = req.body;

    if (!applicationId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Application ID and OTP are required.'
      });
    }

    const application = await TeacherApplication.findById(applicationId).select('+verificationId +otp +otpExpiry');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or session has expired.'
      });
    }

    if (application.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'This application has already been verified.'
      });
    }

    console.log(`🔍 Validating OTP for Application: ${applicationId}...`);

    /* --- MESSAGE CENTRAL (COMMENTED OUT) ---
    try {
      await messageCentral.validateOTP(application.verificationId, otp);
    } catch (err) {
      console.error('❌ OTP Validation Failed:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid or expired OTP. Please try again.'
      });
    }
    ---------------------------------------- */

    // --- BLACK SMS OTP VALIDATION ---
    if (!application.otp || application.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please enter the correct code.'
      });
    }
    if (application.otpExpiry && new Date(application.otpExpiry).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.'
      });
    }

    // OTP is valid! Mark as verified
    application.isPhoneVerified = true;
    application.otp = undefined;
    application.otpExpiry = undefined;
    application.verificationId = undefined; // Clear the verificationId
    await application.save();

    console.log(`✅ Phone verified! Sending confirmation email to: ${application.email}`);

    // Send application confirmation email in the background
    sendTeacherApplicationConfirmation(application.email, application.name).catch(err => {
      console.error('⚠️ Failed to send confirmation email:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully! Your application has been submitted for review.'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Resend SMS OTP
// @route   POST /api/teachers/resend-otp
// @access  Public
export const resendTeacherOTP = async (req, res, next) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required.'
      });
    }

    const application = await TeacherApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application session not found.'
      });
    }

    if (application.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Application is already verified.'
      });
    }

    console.log(`🔄 Resending OTP to ${application.phone}...`);

    /* --- MESSAGE CENTRAL (COMMENTED OUT) ---
    const mcResponse = await messageCentral.sendSMSOTP(application.phone);

    if (mcResponse && mcResponse.success) {
      application.verificationId = mcResponse.verificationId;
      await application.save();
      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully.'
      });
    } else {
      throw new Error('Failed to send resend trigger.');
    }
    ---------------------------------------- */

    // --- BLACK SMS RESEND OTP ---
    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      application.otp = generatedOtp;
      application.otpExpiry = Date.now() + 15 * 60 * 1000;
      await sendBlackSMSOTP(application.phone, generatedOtp);
      await application.save();
      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully.'
      });
    } catch (err) {
      console.error('❌ Black SMS resend error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend OTP via Black SMS.'
      });
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Get all verified teacher applications (Admin only)
// @route   GET /api/teachers
// @access  Private/Admin
export const getTeacherApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Filter to only verified numbers
    const query = { isPhoneVerified: true };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const applications = await TeacherApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await TeacherApplication.countDocuments(query);

    const baseQuery = { isPhoneVerified: true };
    const [totalVerified, pending, approved, rejected] = await Promise.all([
      TeacherApplication.countDocuments(baseQuery),
      TeacherApplication.countDocuments({ ...baseQuery, status: 'pending' }),
      TeacherApplication.countDocuments({ ...baseQuery, status: 'approved' }),
      TeacherApplication.countDocuments({ ...baseQuery, status: 'rejected' })
    ]);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      stats: {
        totalVerified,
        pending,
        approved,
        rejected
      },
      data: applications
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Update application status (Approve/Reject) (Admin only)
// @route   PATCH /api/teachers/:id/status
// @access  Private/Admin
export const updateTeacherStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, approved, or rejected.'
      });
    }

    const application = await TeacherApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Teacher application not found.'
      });
    }

    console.log(`✉️ Application ${status}! Dispatching email to: ${application.email}`);

    // Send email notification on status change in the background
    sendTeacherStatusUpdate(application.email, application.name, status).catch(err => {
      console.error('⚠️ Failed to send status update email:', err.message);
    });

    res.status(200).json({
      success: true,
      message: `Application status updated to ${status} successfully.`,
      data: application
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete application (Admin only)
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
export const deleteTeacherApplication = async (req, res, next) => {
  try {
    const application = await TeacherApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Teacher application not found.'
      });
    }

    // Clean up uploaded files in Cloudinary
    try {
      if (application.resumePublicId) {
        await cloudinary.uploader.destroy(application.resumePublicId, { 
          resource_type: application.resumeResourceType || 'raw' 
        });
      }
      if (application.demoVideoPublicId) {
        await cloudinary.uploader.destroy(application.demoVideoPublicId, { resource_type: 'video' });
      }
      console.log('✅ Cleaned up assets from Cloudinary.');
    } catch (err) {
      console.error('⚠️ Failed to delete assets from Cloudinary during deletion:', err.message);
    }

    await application.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Teacher application and its files deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
};
