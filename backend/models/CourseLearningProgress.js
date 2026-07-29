import mongoose from 'mongoose';

const courseLearningProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  // The order index (0-based) of the section/day the user is currently on
  currentDayIndex: {
    type: Number,
    default: 0,
  },
  // Array of section IDs for which theory (study notes) teaching is completed
  completedTheorySectionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  }],
  // Array of section IDs for which user has confirmed watching videos
  videoWatchedSectionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
  }],
  // Track the index of the last note taught within the current day (0-based)
  lastNoteIndexTaught: {
    type: Number,
    default: -1, // -1 means not started
  },
  // Timestamp of last activity for "welcome back" message
  lastActivity: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index so we can quickly look up a specific user+course progress doc
courseLearningProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseLearningProgress = mongoose.model('CourseLearningProgress', courseLearningProgressSchema);

export default CourseLearningProgress;
