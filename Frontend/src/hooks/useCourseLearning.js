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
          set(() => ({
            progress,
            isLoadingProgress: false,
            // Restore the saved day index from progress
            selectedDayIndex: progress?.currentDayIndex || 0,
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

        set(() => ({ dayLessonComplete: true }));

        await get().saveProgress({
          completedTheorySectionIds: newCompleted,
          currentDayIndex: nextDayIndex,
          lastNoteIndexTaught: -1, // reset for next day
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
      getUnlockedDayIndex: () => {
        const { progress } = get();
        return progress?.currentDayIndex || 0;
      },

      isDayLocked: (dayIndex) => {
        return dayIndex > get().getUnlockedDayIndex();
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
