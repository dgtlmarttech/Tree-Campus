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
      required: [true, 'Resume is required'] // URL of Resume uploaded to Cloudinary
    },
    resumePublicId: {
      type: String,
      required: true
    },
    resumeResourceType: {
      type: String,
      enum: ['raw', 'image'],
      default: 'raw'
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
      default: Date.now
    },
    expireAt: {
      type: Date,
      default: () => Date.now() + 86400000, // 24 hours from now
      expires: 0 // Document expires when current time >= expireAt
    }
  },
  {
    timestamps: true,
    autoIndex: false
  }
);

teacherApplicationSchema.pre('save', function () {
  if (this.isPhoneVerified) {
    this.expireAt = undefined;
  }
});

const TeacherApplication = mongoose.model('TeacherApplication', teacherApplicationSchema);
export default TeacherApplication;
