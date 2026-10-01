import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = (import.meta.env.VITE_API_URL || '');

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const useCourseLearning = create(
  persist(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────────────────────
      isCourseMode: false,          // whether the course mode panel is visible
      enrolledCourses: [],          // fetched from enrollment API
      selectedCourseId: null,       // currently selected courseId
      courseStructure: null,        // { course, days[], totalDays }
      selectedDayIndex: 0,          // which day the user is viewing (0-based)
      progress: null,               // CourseLearningProgress doc from backend
      isLoadingStructure: false,
      isLoadingProgress: false,
      structureError: null,
      dayLessonComplete: false,     // true after AI signals [LESSON_COMPLETE]

      // ── Toggles ───────────────────────────────────────────────────────────
      toggleCourseMode: () => {
        set(state => ({ isCourseMode: !state.isCourseMode }));
      },

      setCourseMode: (val) => {
        set(() => ({ isCourseMode: val }));
      },

      setDayLessonComplete: (val) => {
        set(() => ({ dayLessonComplete: val }));
      },

      // ── Fetch enrolled courses (from enrollment API) ──────────────────────
      fetchEnrolledCourses: async () => {
        try {
          console.log('[useCourseLearning] Fetching enrolled courses from profile...');
          // The application stores enrollments in User.enrolledCourses, so we fetch the profile
          const data = await apiFetch('/auth/profile');
          console.log('[useCourseLearning] Profile Response:', data);
          
          let courses = [];
          if (data.user && data.user.enrolledCourses) {
            courses = data.user.enrolledCourses.map(e => e.courseId).filter(Boolean);
          }
          console.log('[useCourseLearning] Extracted courses:', courses);

          set(() => ({ enrolledCourses: courses }));
          
          const { selectedCourseId } = get();
          if (!selectedCourseId && courses.length > 0) {
            const firstCourse = courses[0];
            const courseId = firstCourse._id || firstCourse.courseId?._id || firstCourse.courseId;
            if (courseId) {
              console.log('[useCourseLearning] Auto-selecting course:', courseId);
              set(() => ({ selectedCourseId: courseId }));
            }
          }
          return courses;
        } catch (err) {
          console.error('[useCourseLearning] fetchEnrolledCourses error:', err);
          return [];
        }
      },

      // ── Select a course and fetch its structure ───────────────────────────
      selectCourse: async (courseId) => {
        set(() => ({
          selectedCourseId: courseId,
          courseStructure: null,
          progress: null, // Clear progress so UI waits
          selectedDayIndex: 0,
          dayLessonComplete: false,
          structureError: null,
        }));
        await Promise.all([
          get().fetchCourseStructure(courseId),
          get().fetchProgress(courseId)
        ]);
      },

      // ── Fetch course structure (sections + notes + lessons) ───────────────
      fetchCourseStructure: async (courseId) => {
        set(() => ({ isLoadingStructure: true, structureError: null }));
        try {
          const data = await apiFetch(`/ai/course-learning/structure/${courseId}`);
          set(() => ({
            courseStructure: data.data,
            isLoadingStructure: false,
          }));
          return data.data;
        } catch (err) {
          console.error('useCourseLearning fetchCourseStructure error:', err);
          set(() => ({
            isLoadingStructure: false,
            structureError: 'Failed to load course structure. Please try again.',
          }));
        }
      },

      // ── Fetch progress from backend ───────────────────────────────────────
      fetchProgress: async (courseId) => {
        set(() => ({ isLoadingProgress: true }));
        try {
          const data = await apiFetch(`/ai/course-learning/progress/${courseId}`);
          const progress = data.data;
          
          // Determine the highest unlocked day for initial selection
          let targetDay = progress?.currentDayIndex || 0;
          
          // Helper to check lock logic manually before state is updated
          const checkLock = (dayIndex) => {
             if (dayIndex === 0) return false;
             if (!progress) return true;
             
             for (let i = 1; i <= dayIndex; i++) {
                let locked = false;
                const prev = progress.dayCompletions?.find(c => c.dayIndex === i - 1);
                if (prev) {
                    if (Date.now() < (new Date(prev.completedAt).getTime() + (24 * 60 * 60 * 1000))) {
                        locked = true;
                    }
                } else {
                    if (i > (progress.currentDayIndex || 0)) {
                        locked = true;
                    }
                }
                if (locked) return true;
             }
             return false;
          };

          while (targetDay > 0 && checkLock(targetDay)) {
             targetDay--;
          }

          set(() => ({
            progress,
            isLoadingProgress: false,
            selectedDayIndex: targetDay,
          }));
          return progress;
        } catch (err) {
          console.error('useCourseLearning fetchProgress error:', err);
          set(() => ({ isLoadingProgress: false }));
        }
      },

      // ── Save progress to backend ──────────────────────────────────────────
      saveProgress: async (updates) => {
        const { selectedCourseId } = get();
        if (!selectedCourseId) return;
        try {
          const data = await apiFetch(
            `/ai/course-learning/progress/${selectedCourseId}`,
            { method: 'POST', body: JSON.stringify(updates) }
          );
          set(() => ({ progress: data.data }));
          return data.data;
        } catch (err) {
          console.error('useCourseLearning saveProgress error:', err);
        }
      },

      // ── Select a day ──────────────────────────────────────────────────────
      selectDay: (dayIndex) => {
        set(() => ({
          selectedDayIndex: dayIndex,
          dayLessonComplete: false,
        }));
      },

      // ── Mark current day theory as complete ───────────────────────────────
      markDayTheoryComplete: async (sectionId) => {
        const { progress, selectedCourseId, selectedDayIndex, courseStructure } = get();
        if (!selectedCourseId) return;

        const currentIds = progress?.completedTheorySectionIds || [];
        const alreadyDone = currentIds.some(id => id.toString() === sectionId.toString());
        if (alreadyDone) return;

        const newCompleted = [...currentIds, sectionId];
        // Advance to next day if available
        const nextDayIndex = Math.min(selectedDayIndex + 1, (courseStructure?.totalDays || 1) - 1);
        const maxCurrent = Math.max(progress?.currentDayIndex || 0, nextDayIndex);

        set(() => ({ dayLessonComplete: true }));

        await get().saveProgress({
          completedTheorySectionIds: newCompleted,
          currentDayIndex: maxCurrent,
          lastNoteIndexTaught: -1, // reset for next day
          newlyCompletedDayIndex: selectedDayIndex, // record completion timestamp
        });
      },

      // ── Mark day videos as watched ────────────────────────────────────────
      markVideosWatched: async (sectionId) => {
        const { progress, selectedCourseId } = get();
        if (!selectedCourseId) return;

        const currentIds = progress?.videoWatchedSectionIds || [];
        const alreadyDone = currentIds.some(id => id.toString() === sectionId.toString());
        if (alreadyDone) return;

        await get().saveProgress({
          videoWatchedSectionIds: [...currentIds, sectionId],
        });
      },

      // ── Computed helpers ──────────────────────────────────────────────────
      isIntroShown: (dayIndex) => {
        const { progress } = get();
        if (!progress || !progress.dayIntros) return false;
        return progress.dayIntros.some(i => i.dayIndex === dayIndex);
      },

      getLastNoteIndex: () => {
        const { progress } = get();
        return progress?.lastNoteIndexTaught ?? -1;
      },

      getUnlockedDayIndex: () => {
        const { progress } = get();
        return progress?.currentDayIndex || 0;
      },
      
      getUnlockTime: (dayIndex) => {
        if (dayIndex === 0) return null;
        
        // If the *previous* day is also locked, this day is domino-locked.
        // It has no definitive unlock time yet, because the user must first unlock and complete the previous day.
        if (get().isDayLocked(dayIndex - 1)) return null;

        const { progress } = get();
        if (!progress || !progress.dayCompletions) return null;
        
        const prevDayCompletion = progress.dayCompletions.find(c => c.dayIndex === dayIndex - 1);
        if (!prevDayCompletion) return null;
        
        return new Date(prevDayCompletion.completedAt).getTime() + (24 * 60 * 60 * 1000);
      },

      isDayLocked: (dayIndex) => {
        if (dayIndex === 0) return false;
        
        const { progress } = get();
        if (!progress) return true;
        
        for (let i = 1; i <= dayIndex; i++) {
           let locked = false;
           const prevCompletion = progress.dayCompletions?.find(c => c.dayIndex === i - 1);
           
           if (prevCompletion) {
               const unlockTimeMs = new Date(prevCompletion.completedAt).getTime() + (24 * 60 * 60 * 1000);
               if (Date.now() < unlockTimeMs) {
                   locked = true;
               }
           } else {
               if (i > (progress.currentDayIndex || 0)) {
                   locked = true;
               }
           }
           
           if (locked) return true; // If day i is locked, all subsequent days are also locked
        }
        
        return false;
      },

      isDayTheoryComplete: (sectionId) => {
        const { progress } = get();
        if (!progress || !sectionId) return false;
        return (progress.completedTheorySectionIds || []).some(
          id => id.toString() === sectionId.toString()
        );
      },

      isDayVideoWatched: (sectionId) => {
        const { progress } = get();
        if (!progress || !sectionId) return false;
        return (progress.videoWatchedSectionIds || []).some(
          id => id.toString() === sectionId.toString()
        );
      },
    }),
    {
      name: 'course-learning-storage',
      partialize: (state) => ({
        selectedCourseId: state.selectedCourseId,
        selectedDayIndex: state.selectedDayIndex,
        isCourseMode: state.isCourseMode,
      }),
    }
  )
);
