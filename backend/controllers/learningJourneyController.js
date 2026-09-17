import CourseLearningProgress from '../models/CourseLearningProgress.js';
import LearningDayMapping from '../models/LearningDayMapping.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

const check24HourLock = (dayCompletions, targetDay) => {
  if (targetDay <= 1) return { locked: false };
  
  const prevDayCompletion = dayCompletions.find(c => c.dayIndex === targetDay - 1);
  if (!prevDayCompletion) {
    return { locked: true, reason: 'Previous day not completed' };
  }
  
  return { locked: false };
};

export const getCurrentJourneyState = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const progress = await CourseLearningProgress.findOne({ userId }).sort({ updatedAt: -1 });
    
    if (!progress) {
      const mapping = await LearningDayMapping.findOne({ day: 1 }).populate('courseSectionId quizId');
      return res.status(200).json({
        success: true,
        currentDay: 1,
        locked: false,
        journeyDayStates: [],
        mapping
      });
    }

    let maxCompletedDay = 0;
    if (progress.dayCompletions && progress.dayCompletions.length > 0) {
      maxCompletedDay = Math.max(...progress.dayCompletions.map(c => c.dayIndex));
    }
    
    let targetDay = maxCompletedDay + 1;
    if (targetDay > 90) targetDay = 90;
    
    if (progress.isJourneyComplete) {
      return res.status(200).json({
        success: true,
        isJourneyComplete: true,
        currentDay: 90,
        journeyDayStates: progress.journeyDayStates
      });
    }

    const lockStatus = check24HourLock(progress.dayCompletions, targetDay);
    
    const mapping = await LearningDayMapping.findOne({ day: targetDay }).populate('courseSectionId quizId');

    res.status(200).json({
      success: true,
      currentDay: targetDay,
      locked: lockStatus.locked,
      lockReason: lockStatus.reason,
      mapping,
      journeyDayStates: progress.journeyDayStates,
      completedTheorySectionIds: progress.completedTheorySectionIds,
      videoWatchedSectionIds: progress.videoWatchedSectionIds
    });
  } catch (error) {
    console.error('Error fetching journey state:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const updateSectionAction = async (req, res) => {
  try {
    const userId = req.user._id;
    const { day, sectionType, action, courseId } = req.body;
    
    if (!day || day < 1 || day > 90) {
      return res.status(400).json({ success: false, error: 'Invalid day.' });
    }
    
    if (!['course', 'spokee', 'game', 'quiz'].includes(sectionType)) {
      return res.status(400).json({ success: false, error: 'Invalid sectionType.' });
    }
    
    if (!['complete', 'skip'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action.' });
    }
    
    if (!courseId) {
      return res.status(400).json({ success: false, error: 'courseId is required.' });
    }

    let progress = await CourseLearningProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = new CourseLearningProgress({ userId, courseId });
    }
    
    if (progress.isJourneyComplete) {
      return res.status(400).json({ success: false, error: 'Journey is already complete.' });
    }

    const lockStatus = check24HourLock(progress.dayCompletions, day);
    if (lockStatus.locked) {
      return res.status(403).json({ success: false, error: lockStatus.reason });
    }

    let dayState = progress.journeyDayStates.find(d => d.dayNumber === day);
    if (!dayState) {
      dayState = { dayNumber: day, courseStatus: 'not_started', spokeeStatus: 'not_started', gameStatus: 'not_started', quizStatus: 'not_started' };
      progress.journeyDayStates.push(dayState);
    }
    
    const statusField = sectionType + 'Status';
    if (dayState[statusField] === 'completed' || dayState[statusField] === 'skipped') {
       return res.status(400).json({ success: false, error: 'Section already completed or skipped.' });
    }
    
    if (action === 'complete') {
       dayState[statusField] = 'completed';
    } else if (action === 'skip') {
       dayState[statusField] = 'skipped';
    }
    
    const index = progress.journeyDayStates.findIndex(d => d.dayNumber === day);
    progress.journeyDayStates[index] = dayState;

    const mapping = await LearningDayMapping.findOne({ day });
    
    let isCourseDone = dayState.courseStatus === 'skipped' || dayState.courseStatus === 'completed';
    if (!isCourseDone && mapping) {
       const hasTheory = progress.completedTheorySectionIds.includes(mapping.courseSectionId);
       const hasVideo = progress.videoWatchedSectionIds.includes(mapping.courseSectionId);
       if (hasTheory || hasVideo) {
         isCourseDone = true;
       }
    }
    
    const isSpokeeDone = dayState.spokeeStatus === 'completed' || dayState.spokeeStatus === 'skipped';
    const isGameDone = dayState.gameStatus === 'completed' || dayState.gameStatus === 'skipped';
    const isQuizDone = dayState.quizStatus === 'completed' || dayState.quizStatus === 'skipped';
    
    if (isCourseDone && isSpokeeDone && isGameDone && isQuizDone) {
      const alreadyCompleted = progress.dayCompletions.find(c => c.dayIndex === day);
      if (!alreadyCompleted) {
         progress.dayCompletions.push({ dayIndex: day, completedAt: new Date() });
         
         if (day < 90) {
           try {
             await Notification.create({
               userId: userId,
               title: `Day ${day + 1} is Ready!`,
               body: `Great job completing Day ${day}. Start learning Day ${day + 1} now.`,
               type: 'learning_journey',
               route: '/learning-journey'
             });
           } catch (notifyErr) {
             console.error('Error creating notification:', notifyErr);
           }
         }
      }
      
      if (day === 90) {
        progress.isJourneyComplete = true;
      }
    }

    await progress.save();
    
    res.status(200).json({ success: true, dayState, isJourneyComplete: progress.isJourneyComplete });
  } catch (error) {
    console.error('Error updating journey section:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
