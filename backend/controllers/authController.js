import User from '../models/User.js';
import { generateTokens } from '../utils/generateToken.js';
import { verifyRefreshToken } from '../middleware/auth.js';
import * as messageCentral from '../utils/messageCentral.js';
import { sendOTPEmail } from '../utils/sendEmail.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapPath = path.join(__dirname, '..', 'utils', 'phoneEmailMap.json');
let phoneEmailMap = {};

try {
    if (fs.existsSync(mapPath)) {
        phoneEmailMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    }
} catch (err) {
    console.error('❌ Failed to load phone mappings:', err.message);
}

// ─────────────────────────────────────────────
// Helper: is this a WP placeholder phone?
// ─────────────────────────────────────────────
const isPlaceholderPhone = (phone) => !phone || phone === '0000000000' || phone.startsWith('wp_') || phone.startsWith('unlinked_');

// ─────────────────────────────────────────────
// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
// ─────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'This phone number is already registered to another account' });
      }
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role?.toLowerCase() || 'student',
    });

    let otpSent = true;
    let otpError = null;

    // No local OTP generation here - rely on Message Central's own code

    try {
      const mcResponse = await messageCentral.sendWhatsAppOTP(phone);
      if (mcResponse.success) {
        user.verificationId = mcResponse.verificationId;
      }
      await user.save();
    } catch (err) {
      console.error('❌ Failed to send WhatsApp OTP during signup:', err.message);
      otpSent = false;
      otpError = err.message;
    }

    res.status(201).json({
      success: true,
      message: otpSent
        ? 'User registered. Please verify your phone with the OTP sent on WhatsApp.'
        : `User registered, but WhatsApp OTP failed: ${otpError}. Please try resending OTP.`,
      data: { userId: user._id, email: user.email, name: user.name, phone: user.phone, otpSent },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
// ─────────────────────────────────────────────
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpiry +verificationId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

    const now = Date.now();
    const expiry = user.otpExpiry ? new Date(user.otpExpiry).getTime() : 0;
    
    // Allow fallback to Message Central even if local expiry is reached
    if (expiry < now) {
      console.log(`ℹ️ [DEBUG] Local OTP Expired: Expiry=${expiry}, Now=${now}. Proceeding to Message Central validation.`);
    }
    
    // SMS Verification (Rely solely on Message Central)
    try {
      await messageCentral.validateOTP(user.verificationId, otp);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.verificationId = undefined;
    await user.save();

    const tokens = generateTokens(user._id);

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isVerified: user.isVerified },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
// ─────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email, newPhone } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    // If new phone number is provided, update it
    if (newPhone) {
      // Validate phone number
      if (newPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
      }

      // Check if phone number is already in use by another user
      const existingPhone = await User.findOne({ phone: newPhone, _id: { $ne: user._id } });
      if (existingPhone) {
        return res.status(400).json({ success: false, message: 'Phone number already registered to another account' });
      }

      user.phone = newPhone;
      await user.save();
    }

    if (!user.phone) {
      return res.status(400).json({ success: false, message: 'Phone number not found for this user. Please contact support.' });
    }

    try {
      const mcResponse = await messageCentral.sendWhatsAppOTP(user.phone);
      if (mcResponse.success) {
        user.verificationId = mcResponse.verificationId;
        await user.save();
      }
    } catch (err) {
      console.error('❌ Failed to resend WhatsApp OTP:', err.message);
      
      // ✅ Handle "REQUEST_ALREADY_EXISTS" as success (OTP is already active)
      if (err.message && err.message.includes('REQUEST_ALREADY_EXISTS')) {
        return res.status(200).json({ 
          success: true, 
          message: 'OTP already sent to your WhatsApp. Please check your messages.' 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: err.message || 'WhatsApp service error. Please try again later.' 
      });
    }

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Login user (Hybrid: MongoDB → MySQL)
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find user in MongoDB
    let user = await User.findOne({ email })
      .select('+password')
      .populate({ path: 'enrolledCourses.courseId', select: 'title thumbnail category' })
      .populate({ path: 'completedLessons.lessonId', select: 'title' })
      .populate('certificates');

    let authenticatedUser = null;
    let loginSource = 'mongodb';

    // Step 2: Try MongoDB password
    if (user) {
      console.log(`🔍 Checking MongoDB password for ${email}...`);
      const isMatch = await user.comparePassword(password);
      if (isMatch) authenticatedUser = user;
    }

    // Step 4: Final result
    if (!authenticatedUser) {
      // ✅ Handle migrated user password expiry prompt
      // If the user exists in the DB but the password was incorrect, trigger the Expiry/OTP modal
      if (user && (user.isWpMigrated || isPlaceholderPhone(user.phone))) {
        return res.status(401).json({ 
          success: false, 
          errorCode: 'PASSWORD_EXPIRED',
          isPlaceholderPhone: isPlaceholderPhone(user.phone), // ✅ NEW: Inform frontend if phone login is viable
          message: 'Your password has expired for security reasons. Please change it or login with Phone OTP.' 
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log(`✅ Login successful via [${loginSource}] for ${email}`);

    const tokens = generateTokens(authenticatedUser._id);
    const userRole = authenticatedUser.role?.toLowerCase() || 'student';

    // ✅ Detect if user needs to add a phone number
    const userNeedsPhone = isPlaceholderPhone(authenticatedUser.phone);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      needsPhoneSetup: userNeedsPhone,
      data: {
        user: {
          id: authenticatedUser._id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          role: userRole,
          isVerified: authenticatedUser.isVerified,
          isWpMigrated: authenticatedUser.isWpMigrated || false,
          // ✅ Don't expose wp_ placeholder to frontend — send null instead
          phone: isPlaceholderPhone(authenticatedUser.phone) ? null : authenticatedUser.phone,
          createdAt: authenticatedUser.createdAt,
          profilePicture: authenticatedUser.profilePicture || '',
          enrolledCourses: authenticatedUser.enrolledCourses || [],
          completedLessons: authenticatedUser.completedLessons || [],
          certificates: authenticatedUser.certificates || [],
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Forgot password — Send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;

    let user = null;

    // ✅ 1. Try direct lookup (email or phone)
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    if (!user && phone) {
      // ✅ NEW: Dynamic Duplicate Check for Forgot Password
      const phoneCount = await User.countDocuments({ phone });
      
      if (phoneCount > 1 && !email) {
        return res.status(409).json({
          success: false,
          errorCode: 'MULTIPLE_ACCOUNTS',
          message: 'This phone number is registered to multiple accounts. Please provide your Email Address above to identify your account.'
        });
      }
      user = await User.findOne({ phone });
    }

    // ✅ 2. Check CSV Phone-Email Map (for users not yet linked)
    if (!user && phone && phoneEmailMap[phone]) {
      const emailFromMap = phoneEmailMap[phone];
      console.log(`🔗 ForgotPwd: Phone ${phone} mapped to email ${emailFromMap} via CSV.`);
      user = await User.findOne({ email: emailFromMap });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'Phone or email not match',
      });
    }

    // ✅ 3. Determine which phone to send OTP to
    let targetPhone = user.phone;
    const hasRealPhone = !isPlaceholderPhone(targetPhone);

    if (hasRealPhone) {
      // --- Case A: Regular user with a verified phone on file ---
      if (!phone) {
        return res.status(400).json({
          success: false,
          errorCode: 'PHONE_REQUIRED',
          message: 'Please provide your registered phone number to receive an SMS OTP.',
        });
      }
      
      // Strict Check: Form phone must match DB phone
      if (phone !== targetPhone) {
        return res.status(403).json({
          success: false,
          errorCode: 'PHONE_MISMATCH',
          message: 'The phone number provided does not match the one registered to this account.',
        });
      }
    } else {
      // --- Case B: Migrated/Legacy/Placeholder User: No real phone on file yet ---
      if (phone && /^\d{10}$/.test(phone)) {
        // ✅ NEW: Check if this new phone is already taken by another user's "Real Phone"
        const phoneTaken = await User.findOne({ phone, _id: { $ne: user._id } });
        if (phoneTaken && !isPlaceholderPhone(phoneTaken.phone)) {
          return res.status(409).json({ 
            success: false, 
            message: 'The provided phone number is already registered to another account. Please use your own number.' 
          });
        }

        // Use the new valid phone provided in the request
        targetPhone = phone;
        console.log(`🔗 ForgotPwd: Potential phone link ${phone} for placeholder user ${user.email}`);
      } else {
        // If it's a placeholder user, we MUST have a valid new phone from the request
        return res.status(400).json({
          success: false,
          errorCode: 'PHONE_REQUIRED',
          message: 'Please provide a valid 10-digit phone number to receive an SMS OTP.',
        });
      }
    }
    
    // No local OTP needed for SMS Forgot Password

    try {
      const mcResponse = await messageCentral.sendSMSOTP(targetPhone);
      if (mcResponse.success) {
        user.verificationId = mcResponse.verificationId;
      }
      await user.save();
    } catch (err) {
      console.error('❌ Failed to send SMS OTP for password reset:', err.message);
      
      // Handle SMS API rate limits gracefully
      if (err.message && err.message.includes('REQUEST_ALREADY_EXISTS')) {
        return res.status(200).json({ 
          success: true, 
          message: 'OTP already sent to your phone. Please check your SMS messages.' 
        });
      }

      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to send SMS OTP. Please check your phone number.',
      });
    }

    res.status(200).json({ success: true, message: 'OTP sent to your phone successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
// ─────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { email, phone, otp, password } = req.body;

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+otp +otpExpiry +password +verificationId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = Date.now();
    const expiry = user.otpExpiry ? new Date(user.otpExpiry).getTime() : 0;

    // Allow fallback even if local expiry check fails (Trust the provider)
    if (expiry < now) {
      console.log(`ℹ️ [DEBUG] ResetPwd OTP Expired local compare: Expiry=${expiry}, Now=${now}.`);
    }

    try {
      await messageCentral.validateOTP(user.verificationId, otp);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid OTP' });
    }

    // Save the provided phone number permanently if their old one was missing/placeholder
    if (phone && isPlaceholderPhone(user.phone)) {
      const phoneTaken = await User.findOne({ phone, _id: { $ne: user._id } });
      if (!phoneTaken) {
        user.phone = phone;
      }
    }

    user.password = password; // pre-save hook will hash this
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.verificationId = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
// ─────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const tokens = generateTokens(decoded.id);
    res.status(200).json({ success: true, message: 'Token refreshed successfully', data: tokens });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
// ─────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpiry')
      .populate({ path: 'enrolledCourses.courseId', select: 'title thumbnail category' })
      .populate({ path: 'completedLessons.lessonId', select: 'title' })
      .populate('certificates')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        // ✅ Don't expose wp_ placeholder to frontend
        phone: isPlaceholderPhone(user.phone) ? null : user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isWpMigrated: user.isWpMigrated || false,
        profilePicture: user.profilePicture || '',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        enrolledCourses: user.enrolledCourses || [],
        completedLessons: user.completedLessons || [],
        certificates: user.certificates || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Complete Google user profile (phone + password)
// @route   POST /api/auth/complete-google-profile
// @access  Private
// ─────────────────────────────────────────────
const completeGoogleProfile = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId).select('+password +googleId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.googleId) {
      return res.status(400).json({ success: false, message: 'This endpoint is only for Google signup users' });
    }

    if (user.phone && !isPlaceholderPhone(user.phone) && user.password) {
      return res.status(400).json({ success: false, message: 'Profile already complete' });
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
    }

    const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Phone number already registered to another account' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    user.phone = phone;
    user.password = password;
    user.isVerified = false;

    // No local OTP needed for Google Profile SMS
    let otpSent = true;
    let otpError = null;

    try {
      const mcResponse = await messageCentral.sendSMSOTP(phone);
      if (mcResponse.success) user.verificationId = mcResponse.verificationId;
    } catch (err) {
      otpSent = false;
      otpError = err.message;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: otpSent
        ? 'Profile updated. Please verify your phone with the OTP sent via SMS.'
        : `Profile updated, but SMS OTP failed: ${otpError}. Please try resending OTP.`,
      data: { userId: user._id, email: user.email, phone: user.phone, otpSent, needsPhoneVerification: true },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Request Login OTP
// @route   POST /api/auth/request-login-otp
// @access  Public
// ─────────────────────────────────────────────
const requestLoginOTP = async (req, res, next) => {
  try {
    const { phone, email } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
    }

    let user = null;

    // ✅ Check how many accounts share this phone
    const usersWithPhone = await User.find({ phone }).select('+password');
    
    // Ownership Check: Is there exactly one verified owner?
    const verifiedOwner = usersWithPhone.find(u => u.isPhoneVerified === true);

    if (usersWithPhone.length > 1) {
      // If we have a verified owner, skip the conflict and use them directly
      if (verifiedOwner) {
        console.log(`🛡️ [OWNERSHIP] Verified owner found for ${phone}: ${verifiedOwner.email}. Bypassing conflict.`);
        user = verifiedOwner;
      } else {
        // Multiple unverified accounts → user must claim this phone
        console.log(`⚠️ Multiple accounts for ${phone}. Sending PHONE_CLAIM_REQUIRED.`);
        return res.status(409).json({
          success: false,
          errorCode: 'PHONE_CLAIM_REQUIRED',
          message: 'This phone number is linked to multiple accounts. Please verify your email to claim it.'
        });
      }
    } else if (usersWithPhone.length === 1) {
      user = usersWithPhone[0];
    }
    
    // CSV Map fallback
    if (!user && phoneEmailMap[phone]) {
      const emailFromMap = phoneEmailMap[phone];
      user = await User.findOne({ email: emailFromMap });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        errorCode: 'USER_NOT_FOUND',
        message: 'No account found with this phone number.' 
      });
    }

    try {
      const mcResponse = await messageCentral.sendSMSOTP(phone);
      if (mcResponse.success) {
        user.verificationId = mcResponse.verificationId;
      }
      await user.save();
    } catch (err) {
      console.error('❌ Failed to send SMS login OTP:', err.message);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to send SMS OTP. Please try again.',
      });
    }

    res.status(200).json({ success: true, message: 'OTP sent to your phone via SMS successfully' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Login with OTP
// @route   POST /api/auth/login-with-otp
// @access  Public
// ─────────────────────────────────────────────
const loginWithOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    let user = null;

    // Find user by phone
    user = await User.findOne({ phone })
      .select('+verificationId +otp +otpExpiry')
      .populate({ path: 'enrolledCourses.courseId', select: 'title thumbnail category' })
      .populate({ path: 'completedLessons.lessonId', select: 'title' })
      .populate('certificates');

    // CSV Map fallback
    if (!user && phoneEmailMap[phone]) {
      const emailFromMap = phoneEmailMap[phone];
      user = await User.findOne({ email: emailFromMap })
        .select('+verificationId +otp +otpExpiry')
        .populate({ path: 'enrolledCourses.courseId', select: 'title thumbnail category' })
        .populate({ path: 'completedLessons.lessonId', select: 'title' })
        .populate('certificates');
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // SMS Verification (Rely solely on Message Central)
    try {
      await messageCentral.validateOTP(user.verificationId, otp);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message || 'Invalid SMS OTP' });
    }

    // Mark as verified
    if (!user.isVerified) {
      user.isVerified = true;
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.verificationId = undefined;
    await user.save();

    const tokens = generateTokens(user._id);
    const userRole = user.role?.toLowerCase() || 'student';

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: userRole,
          isVerified: user.isVerified,
          phone: user.phone,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture || '',
          enrolledCourses: user.enrolledCourses || [],
          completedLessons: user.completedLessons || [],
          certificates: user.certificates || [],
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Send Email OTP for phone claim
// @route   POST /api/auth/send-claim-otp
// @access  Public
// ─────────────────────────────────────────────
const sendClaimOTP = async (req, res, next) => {
  try {
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({ success: false, message: 'Phone and email are required' });
    }

    // Find user with this email who also has this phone
    const user = await User.findOne({ email: email.toLowerCase(), phone }).select('+emailOtp +emailOtpExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email and phone number combination.' });
    }

    // Generate Email OTP
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOtp = emailOtp;
    user.emailOtpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Send Email OTP
    await sendOTPEmail(user.email, user.name, emailOtp, 'TreeCampus: Verify your account');

    console.log(`📧 Claim OTP sent to ${user.email} for phone ${phone}`);
    res.status(200).json({ success: true, message: 'OTP sent to your email successfully' });
  } catch (error) {
    console.error('❌ Send claim OTP error:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Claim phone ownership (verify email OTP + set password + strip from others)
// @route   POST /api/auth/claim-phone
// @access  Public
// ─────────────────────────────────────────────
const claimPhone = async (req, res, next) => {
  try {
    const { phone, email, emailOtp, newPassword } = req.body;

    if (!phone || !email || !emailOtp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Find the user
    const user = await User.findOne({ email: email.toLowerCase(), phone })
      .select('+emailOtp +emailOtpExpiry +password')
      .populate({ path: 'enrolledCourses.courseId', select: 'title thumbnail category' })
      .populate({ path: 'completedLessons.lessonId', select: 'title' })
      .populate('certificates');

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email and phone combination.' });
    }

    // Verify Email OTP
    if (!user.emailOtp || user.emailOtp !== emailOtp || user.emailOtpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // ✅ Set new password and mark ownership
    user.password = newPassword;
    user.isPhoneVerified = true;
    user.isVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiry = undefined;
    await user.save();

    // ✅ Strip phone from ALL other accounts → set to 0000000000
    const stripResult = await User.updateMany(
      { phone, _id: { $ne: user._id } },
      { $set: { phone: '0000000000', isPhoneVerified: false } }
    );

    if (stripResult.modifiedCount > 0) {
      console.log(`🧹 [CLAIM] Stripped phone ${phone} from ${stripResult.modifiedCount} other account(s). Set to 0000000000.`);
    }

    console.log(`✅ [CLAIM] ${user.email} now owns phone ${phone} exclusively.`);

    // Return login tokens
    const tokens = generateTokens(user._id);
    const userRole = user.role?.toLowerCase() || 'student';

    res.status(200).json({
      success: true,
      message: 'Account verified! Phone is now linked to your account only.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: userRole,
          isVerified: user.isVerified,
          phone: user.phone,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture || '',
          enrolledCourses: user.enrolledCourses || [],
          completedLessons: user.completedLessons || [],
          certificates: user.certificates || [],
        },
        ...tokens,
      },
    });
  } catch (error) {
    console.error('❌ Claim phone error:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Send SMS OTP for phone setup (for users with no phone)
// @route   POST /api/auth/request-phone-setup-otp
// @access  Private
// ─────────────────────────────────────────────
const requestPhoneSetupOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone) || isPlaceholderPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit real phone number' });
    }

    // Check if phone is already taken by another user (with real phone)
    const phoneTaken = await User.findOne({ phone, _id: { $ne: req.user.id } });
    if (phoneTaken && !isPlaceholderPhone(phoneTaken.phone)) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered to another account.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    try {
      user.generateOTP();
      const mcResponse = await messageCentral.sendSMSOTP(phone);
      if (mcResponse.success) {
        user.verificationId = mcResponse.verificationId;
      }
      await user.save();
    } catch (err) {
      console.error('❌ Failed to send setup SMS OTP:', err.message);
      return res.status(500).json({ success: false, message: err.message || 'Failed to send SMS OTP.' });
    }

    res.status(200).json({ success: true, message: 'OTP sent to your phone via SMS' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Setup new phone number (for users with no phone)
// @route   POST /api/auth/setup-phone
// @access  Private
// ─────────────────────────────────────────────
const setupPhone = async (req, res, next) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Phone, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+otp +otpExpiry +verificationId +password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Verify OTP
    const isLocalValid = user.otp && user.otp === otp && user.otpExpiry > Date.now();
    if (isLocalValid) {
      console.log(`✅ Local OTP valid for phone setup`);
    } else {
      try {
        await messageCentral.validateOTP(user.verificationId, otp);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
    }

    // Update phone + password
    user.phone = phone;
    user.password = newPassword;
    user.isPhoneVerified = true;
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.verificationId = undefined;
    await user.save();

    // ✅ Strip phone from ALL other accounts → set to 0000000000
    const stripResult = await User.updateMany(
      { phone, _id: { $ne: user._id } },
      { $set: { phone: '0000000000', isPhoneVerified: false } }
    );

    if (stripResult.modifiedCount > 0) {
      console.log(`🧹 [SETUP] Stripped phone ${phone} from ${stripResult.modifiedCount} other account(s). Set to 0000000000.`);
    }

    console.log(`📱 [SETUP] ${user.email} added new phone ${phone}`);

    res.status(200).json({
      success: true,
      message: 'Phone number added successfully!',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          phone: user.phone,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture || '',
        }
      }
    });
  } catch (error) {
    console.error('❌ Setup phone error:', error);
    next(error);
  }
};

export {
  signup,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword,
  logout,
  refreshToken,
  getProfile,
  completeGoogleProfile,
  requestLoginOTP,
  loginWithOTP,
  sendClaimOTP,
  claimPhone,
  requestPhoneSetupOTP,
  setupPhone,
};