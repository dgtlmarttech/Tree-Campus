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
  // Tracks completion times for each day to enforce 24h locks
  dayCompletions: [{
    dayIndex: { type: Number, required: true },
    completedAt: { type: Date, required: true }
  }],
  // Tracks when the welcome intro was shown for each day
  dayIntros: [{
    dayIndex: { type: Number, required: true },
    introShownAt: { type: Date, default: Date.now }
  }],
  // Timestamp of last activity for "welcome back" message
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  // --- Journey Progress ---
  journeyDayStates: [{
    dayNumber: { type: Number, required: true }, // 1 to 90
    courseStatus: { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' },
    spokeeStatus: { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' },
    gameStatus:   { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' },
    quizStatus:   { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' }
  }],
  isJourneyComplete: { type: Boolean, default: false },}, {
  timestamps: true,
});

// Compound index so we can quickly look up a specific user+course progress doc
courseLearningProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const CourseLearningProgress = mongoose.model('CourseLearningProgress', courseLearningProgressSchema);

export default CourseLearningProgress;

