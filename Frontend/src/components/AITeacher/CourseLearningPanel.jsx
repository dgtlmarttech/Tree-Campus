import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useCourseLearning } from '../../hooks/useCourseLearning';
import { useAITeacher } from '../../hooks/useAITeacher';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// ─── Video reminder card ─────────────────────────────────────────────────────
const VideoReminderCard = ({ dayNumber, onMarkWatched, isWatched, courseId }) => {
  const navigate = useNavigate();
  return (
    <div className="mt-3 flex flex-col gap-2 bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <span className="text-xl">🎬</span>
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 text-sm font-semibold leading-tight">
            Watch Day {dayNumber} Videos
          </p>
          <p className="text-amber-200/70 text-xs mt-0.5 leading-tight">
            Go to the Course section to watch the videos.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {!isWatched && (
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-md transition-colors"
          >
            Go to Course
          </button>
        )}
        <button
          onClick={onMarkWatched}
          disabled={isWatched}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            isWatched
              ? 'bg-green-900/60 text-green-300 border border-green-700/50 cursor-default'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
          }`}
        >
          {isWatched ? '✓ Watched' : 'Mark Watched'}
        </button>
      </div>
    </div>
  );
};

// ─── Main Panel Component ────────────────────────────────────────────────────
export const CourseLearningPanel = () => {
  const {
    enrolledCourses,
    selectedCourseId,
    courseStructure,
    selectedDayIndex,
    progress,
    isLoadingStructure,
    isLoadingProgress,
    structureError,
    dayLessonComplete,
    fetchEnrolledCourses,
    selectCourse,
    selectDay,
    saveProgress,
    markDayTheoryComplete,
    markVideosWatched,
    isDayTheoryComplete,
    isDayVideoWatched,
    setDayLessonComplete,
    getUnlockedDayIndex,
    getUnlockTime,
    isIntroShown,
    getLastNoteIndex,
    isDayLocked,
    toggleCourseMode
  } = useCourseLearning();

  const { askAIWithContext, loading: aiLoading, language } = useAITeacher();
  const { user } = useAuth();

  const [hasGreeted, setHasGreeted] = useState(false);
  const [localQuestion, setLocalQuestion] = useState('');
  const greetingFiredRef = useRef(false);
  const dayRef = useRef(selectedDayIndex);
  const noteIndexRef = useRef(0); // tracks which note is currently being taught

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'there';

  const formatUnlockTime = (ms) => {
    if (!ms) return '';
    const now = Date.now();
    const diff = ms - now;
    if (diff <= 0) return 'Available now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 24) {
      return `Available in ${hours}h ${minutes}m`;
    }
    
    const date = new Date(ms);
    return `Unlocks on ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // ── Load enrolled courses on mount ────────────────────────────────────────
  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  // ── Auto-fetch structure when course is selected ──────────────────────────
  useEffect(() => {
    if (selectedCourseId && !courseStructure) {
      selectCourse(selectedCourseId);
    }
  }, [selectedCourseId]);

  // ── Dynamic Countdown Timer for Unlocking Days ──────────────────────────
  const [, setTick] = useState(0);
  useEffect(() => {
    // Tick every minute to update the UI "Available in Xh Ym" and unlock days automatically
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);



  
  // ── Fire teaching when day changes ──────────────────────────────────────
  const fireGreetingRef = useRef(null);
  const teachingTimerRef = useRef(null);

  useEffect(() => {
    // Wait until both structure and progress are loaded!
    if (!courseStructure || !progress || isLoadingProgress || isLoadingStructure) return;
    const currentDay = courseStructure.days[selectedDayIndex];
    if (!currentDay) return;

    if (dayRef.current !== selectedDayIndex) {
      dayRef.current = selectedDayIndex;
      greetingFiredRef.current = false;
    }

    if (!greetingFiredRef.current) {
      greetingFiredRef.current = true;
      setHasGreeted(false);
      setDayLessonComplete(false);
      
      // Delay slightly so 3D model is ready before greeting
      teachingTimerRef.current = setTimeout(() => {
        if (fireGreetingRef.current) {
          fireGreetingRef.current(currentDay);
        }
      }, 500);
    }
  }, [selectedDayIndex, courseStructure, progress, isLoadingProgress, isLoadingStructure]);


  // ── Fire day lesson complete when AI signals it ───────────────────────────
  const handleLessonComplete = useCallback(() => {
    const currentDay = courseStructure?.days[selectedDayIndex];
    if (currentDay) {
      markDayTheoryComplete(currentDay.sectionId);
    }
  }, [courseStructure, selectedDayIndex]);

  // ── Helper: waits for the currently active audio player to finish playing ──
  // Uses the 'ended' event so we never interrupt mid-sentence.
  // Falls back after maxWaitMs to prevent the lesson from getting stuck.
  const waitForAudioEnd = (maxWaitMs = 60000) => {
    return new Promise((resolve) => {
      const attachListener = () => {
        const player = useAITeacher.getState()._activeAudioPlayer;
        if (!player) {
          // No active player — audio already finished or never started
          resolve();
          return;
        }
        let fallback;
        const onEnded = () => {
          clearTimeout(fallback);
          resolve();
        };
        const onError = () => {
          clearTimeout(fallback);
          resolve();
        };
        player.addEventListener('ended', onEnded, { once: true });
        player.addEventListener('error', onError, { once: true });
        // Safety fallback: if ended never fires (e.g. audio killed externally), resolve anyway
        fallback = setTimeout(() => {
          player.removeEventListener('ended', onEnded);
          player.removeEventListener('error', onError);
          resolve();
        }, maxWaitMs);
      };
      // Small delay so playMessage() can register the audio player before we check
      setTimeout(attachListener, 300);
    });
  };

  const fireGreeting = useCallback(async (currentDay) => {
    if (!courseStructure) return;

    useAITeacher.getState().markUserInteracted();
    
    // If the day is already fully completed, just show a completion message and stop.
    if (isDayTheoryComplete(currentDay.sectionId)) {
      const nextDayNum = currentDay.dayNumber + 1;
      const completionText = `✅ You have successfully completed Day ${currentDay.dayNumber}. Day ${nextDayNum} will unlock tomorrow (after 24 hours). See you in the next lesson!`;
      
      const completionMessage = {
        question: '__greeting__',
        answer: completionText,
        audio: null,
        audio_text: completionText, // AI teacher will speak this
        visemes: [],
        lipsync: null,
        id: useAITeacher.getState().messages.length
      };

      useAITeacher.setState((state) => ({
        messages: [...state.messages, completionMessage],
        currentMessage: null,
      }));
      useAITeacher.getState().playMessage(completionMessage);
      setHasGreeted(true);
      return;
    }

    const dayIdx = currentDay.dayNumber - 1;
    const introAlreadyShown = isIntroShown(dayIdx);
    const totalNotes = currentDay.studyNotes?.length || 0;

    let startNoteIndex = 0;

    if (!introAlreadyShown) {
      // 1. Instantly inject a dynamic static greeting for the current day
      const isFirstDay = currentDay.dayNumber === 1;
      const greetingSpoken = isFirstDay 
        ? `Welcome back, ${firstName}! Today is Day 1. I'll explain today's lesson. Let's begin!`
        : `Welcome back, ${firstName}! Today is Day ${currentDay.dayNumber}. I'll explain today's lesson. Let's begin!`;
      
      const greetingBoardText = isFirstDay
        ? `Welcome back, ${firstName}! 👋<br/><br/>Today is <b>Day 1</b>.<br/><br/>I'll explain today's lesson.<br/><br/>Let's begin! 🚀`
        : `Welcome back, ${firstName}! 👋<br/><br/>Today is <b>Day ${currentDay.dayNumber}</b>.<br/><br/>I'll explain today's lesson.<br/><br/>Let's begin! 🚀`;

      const greetingMessage = {
        question: '__greeting__',
        answer: greetingBoardText,
        audio: null,
        audio_text: greetingSpoken,
        visemes: [],
        lipsync: null,
        id: useAITeacher.getState().messages.length
      };

      useAITeacher.setState((state) => ({
        messages: [...state.messages, greetingMessage],
        currentMessage: null,
      }));
      useAITeacher.getState().playMessage(greetingMessage);
      
      // Save that the intro was shown
      saveProgress({ introShownDayIndex: dayIdx });
      await waitForAudioEnd();
    } else {
      // Intro already shown, continue from where the user left off
      const lastIndex = getLastNoteIndex();
      if (lastIndex >= 0 && lastIndex < totalNotes - 1) {
         startNoteIndex = lastIndex + 1;
      } else {
         // Either started fresh or completed all but returned. Start from beginning
         startNoteIndex = 0;
      }
    }

    // 2. Fetch the note's teaching content
    noteIndexRef.current = startNoteIndex;

    const fetchNote = async (noteIdx) => {
      const isLastNote = noteIdx >= totalNotes - 1;
      const payload = {
        question: noteIdx === 0 && !introAlreadyShown
          ? `Please start teaching Day ${currentDay.dayNumber} theory notes now. Begin teaching directly.`
          : `Continue teaching. Now teach note ${noteIdx + 1} of ${totalNotes}.`,
        language,
        courseId: selectedCourseId,
        courseTitle: courseStructure.course.title,
        dayNumber: currentDay.dayNumber,
        dayTitle: currentDay.title,
        studyNotes: currentDay.studyNotes,
        noteIndex: noteIdx,
        isGreeting: false,
      };

      const data = await askAIWithContext(payload, isLastNote ? handleLessonComplete : null);

      if (data && !data.error) {
         saveProgress({ lastNoteIndexTaught: noteIdx });
      }

      // If more notes remain and teacher didn't complete lesson, wait for audio then fetch next
      if (data && !data.lessonComplete && noteIdx < totalNotes - 1) {
        await waitForAudioEnd();
        noteIndexRef.current = noteIdx + 1;
        fetchNote(noteIdx + 1);
      } else if (data?.lessonComplete) {
        handleLessonComplete();
      }
    };

    await fetchNote(startNoteIndex);
    setHasGreeted(true);
  }, [courseStructure, selectedDayIndex, language, askAIWithContext, handleLessonComplete, firstName, isIntroShown, getLastNoteIndex, saveProgress, selectedCourseId, isDayTheoryComplete]);

  useEffect(() => {
    fireGreetingRef.current = fireGreeting;
  });

  const handleAsk = async () => {
    const q = localQuestion.trim();
    if (!q || aiLoading) return;

    const currentDay = courseStructure?.days[selectedDayIndex];
    if (!currentDay) return;

    setLocalQuestion('');

    const payload = {
      question: q,
      language,
      courseId: selectedCourseId,
      courseTitle: courseStructure.course.title,
      dayNumber: currentDay.dayNumber,
      dayTitle: currentDay.title,
      studyNotes: currentDay.studyNotes,
      isGreeting: false,
    };

    await askAIWithContext(payload, handleLessonComplete);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const handleDaySelect = (dayIndex) => {
    if (isDayLocked(dayIndex)) return; // Prevent clicking locked days
    if (dayIndex === selectedDayIndex) return;
    greetingFiredRef.current = false;
    selectDay(dayIndex);
  };

  // Called when user explicitly clicks the Theory Notes box
  const handleTheoryNotesClick = async () => {
    const currentDay = courseStructure?.days[selectedDayIndex];
    if (!currentDay || aiLoading) return;
    // Kill any currently playing audio first
    useAITeacher.getState()._killActiveAudio();
    useAITeacher.getState().markUserInteracted();
    // Reset lesson state so teacher starts fresh
    setHasGreeted(false);
    setDayLessonComplete(false);
    
    // On mobile, auto-close the panel so the user can see the AI Teacher teaching
    if (window.innerWidth < 640) {
      setCourseMode(false);
    }
    
    await fireGreetingRef.current?.(currentDay);
  };

  const handleCourseChange = (e) => {
    greetingFiredRef.current = false;
    selectCourse(e.target.value);
  };

  const currentDay = courseStructure?.days[selectedDayIndex];
  const currentSectionId = currentDay?.sectionId;
  const isCurrentDayComplete = currentSectionId ? isDayTheoryComplete(currentSectionId) : false;
  const isCurrentVideoWatched = currentSectionId ? isDayVideoWatched(currentSectionId) : false;

  // Calculate Overall Progress
  const totalDays = courseStructure?.totalDays || 1;
  const completedDaysCount = progress?.completedTheorySectionIds?.length || 0;
  const progressPercent = Math.round((completedDaysCount / totalDays) * 100);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="absolute top-0 right-0 h-full w-full sm:w-[380px] bg-gray-900/95 border-l border-gray-700/50 shadow-2xl backdrop-blur-xl flex flex-col z-[60] transition-transform duration-300">
      
      {/* ── Top bar: Header & Close ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">📚</span> Course Mode
        </h2>
        <button 
          onClick={toggleCourseMode}
          className="text-gray-400 hover:text-white transition-colors p-1"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Course Selector & Progress ───────────────────────────────────────── */}
      <div className="px-5 pb-4 border-b border-gray-800">
        {(!Array.isArray(enrolledCourses) || enrolledCourses.length === 0) ? (
          <div className="text-gray-400 text-sm italic">
            No enrolled courses found. Enroll in a course to use this feature.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={selectedCourseId || ''}
              onChange={handleCourseChange}
              className="
                w-full bg-gray-800 text-white text-sm font-medium
                border border-gray-700 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-teal-500/50
                cursor-pointer truncate shadow-inner
              "
            >
              {enrolledCourses.map((ec) => {
                const courseId = ec._id || ec.courseId?._id || ec.courseId;
                const courseTitle = ec.title || ec.courseId?.title || 'Course';
                return (
                  <option key={courseId} value={courseId}>
                    {courseTitle}
                  </option>
                );
              })}
            </select>

            {/* Progress Bar */}
            {courseStructure && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Overall Progress</span>
                  <span className="text-teal-400 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Vertical Roadmap ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {isLoadingStructure ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <div className="w-4 h-4 border-2 border-teal-400/50 border-t-teal-400 rounded-full animate-spin" />
            Loading course structure...
          </div>
        ) : structureError ? (
          <div className="flex items-center justify-center py-10 text-red-400 text-sm text-center">
            ⚠️ {structureError}
          </div>
        ) : courseStructure ? (
          <div className="flex flex-col gap-3 pb-8">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
              Learning Roadmap
            </div>
            
            {courseStructure.days.map((day, i) => {
              const locked = isDayLocked(i);
              const done = isDayTheoryComplete(day.sectionId);
              const videoWatched = isDayVideoWatched(day.sectionId);
              const active = i === selectedDayIndex;
              
              return (
                <div 
                  key={day.sectionId}
                  onClick={() => handleDaySelect(i)}
                  className={`
                    relative p-4 rounded-xl border transition-all duration-300
                    ${locked ? 'opacity-50 cursor-not-allowed bg-gray-900/50 border-gray-800' : 'cursor-pointer'}
                    ${active ? 'bg-teal-900/20 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : ''}
                    ${!active && !locked && done ? 'bg-gray-800/40 border-gray-700 hover:border-gray-600' : ''}
                    ${!active && !locked && !done ? 'bg-gray-800/80 border-gray-600 hover:border-gray-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-teal-500 text-white' : done ? 'bg-green-900 text-green-300' : locked ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-gray-200'}`}>
                          Day {day.dayNumber}
                        </span>
                        {done && <span className="text-green-400 text-xs flex items-center">✓ Completed</span>}
                        {locked && <span className="text-gray-500 text-xs flex items-center">🔒 Locked</span>}
                      </div>
                      <h3 className={`text-sm font-semibold truncate ${active ? 'text-white' : locked ? 'text-gray-500' : 'text-gray-200'}`}>
                        {day.title}
                      </h3>
                      {locked && getUnlockTime(i) && (
                        <p className="text-[11px] text-amber-500/80 mt-1">
                           {formatUnlockTime(getUnlockTime(i))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded Active Day Details */}
                  {active && !locked && (
                    <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-3">
                      <div className="flex flex-col gap-2">
                        {/* Theory Notes Box — clickable to trigger AI teaching */}
                        <button
                          onClick={handleTheoryNotesClick}
                          disabled={aiLoading}
                          title="Click to start AI lesson"
                          className={`bg-gray-900/80 rounded-lg p-3 flex flex-col items-center justify-center border transition-all duration-200 text-left w-full
                            ${aiLoading
                              ? 'border-gray-800 opacity-60 cursor-wait'
                              : 'border-teal-700/60 hover:border-teal-400 hover:bg-teal-900/20 cursor-pointer hover:scale-[1.02] active:scale-95'}`}
                        >
                          <span className="text-2xl mb-1">{aiLoading ? '⏳' : '📖'}</span>
                          <span className="text-gray-200 text-sm font-medium text-center leading-tight">
                            {day.totalStudyNotes} Theory Notes
                          </span>
                          <span className="text-teal-400 text-xs mt-1 font-semibold">
                            {aiLoading ? 'Teaching...' : '▶ Start Lesson'}
                          </span>
                        </button>
                      </div>

                      {/* Quick Question Input - commented out as requested
                      {!dayLessonComplete && !isCurrentDayComplete && hasGreeted && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={localQuestion}
                            onChange={e => setLocalQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={aiLoading}
                            placeholder="Ask about today's topic..."
                            className="
                              flex-1 min-w-0 bg-gray-900 border border-gray-700 rounded-lg
                              text-white text-sm px-3 py-2
                              placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50
                            "
                          />
                          <button
                            onClick={handleAsk}
                            disabled={!localQuestion.trim() || aiLoading}
                            className="
                              flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg
                              bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed
                              text-white transition-colors
                            "
                          >
                            {aiLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                      */}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
