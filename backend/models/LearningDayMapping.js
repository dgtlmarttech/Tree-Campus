import mongoose from 'mongoose';

const learningDayMappingSchema = new mongoose.Schema({
  day: { type: Number, required: true, unique: true }, // 1 to 90
  topic: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'] },
  
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  
  spokeeType: { type: String, default: 'AI_TEACHER' },
  spokeeContext: { type: String },
  
  gameType: { type: String, default: 'VOCABULARY_PRACTICE' }, 
  gameLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'] },
  gameSection: { type: Number },
  
  mappingStatus: { type: String, enum: ['FULLY_MAPPED', 'PARTIAL', 'MISSING'], default: 'PARTIAL' }
}, { timestamps: true });

const LearningDayMapping = mongoose.model('LearningDayMapping', learningDayMappingSchema);

export default LearningDayMapping;
