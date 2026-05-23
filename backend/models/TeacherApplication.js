import mongoose from 'mongoose';

const teacherApplicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true
    },
    resume: {
      type: String,
      required: [true, 'Resume is required'] // URL of PDF uploaded to Cloudinary
    },
    resumePublicId: {
      type: String,
      required: true
    },
    demoVideo: {
      type: String,
      required: [true, 'Demo video is required'] // URL of Video uploaded to Cloudinary
    },
    demoVideoPublicId: {
      type: String,
      required: true
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    verificationId: {
      type: String,
      select: false
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // Automatically delete incomplete applications after 24 hours
    }
  },
  {
    timestamps: true
  }
);

teacherApplicationSchema.pre('save', function () {
  if (this.isPhoneVerified) {
    this.createdAt = undefined;
  }
});

const TeacherApplication = mongoose.model('TeacherApplication', teacherApplicationSchema);
export default TeacherApplication;
