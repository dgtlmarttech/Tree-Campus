import React, { useEffect } from 'react';
import { Experience } from '../components/AITeacher/Experience';
import { CourseLearningPanel } from '../components/AITeacher/CourseLearningPanel';
import { useCourseLearning } from '../hooks/useCourseLearning';

const AITeacherPage = () => {
  const isCourseMode = useCourseLearning((state) => state.isCourseMode);
  const setCourseMode = useCourseLearning((state) => state.setCourseMode);
  const selectedCourseId = useCourseLearning((state) => state.selectedCourseId);
  const fetchEnrolledCourses = useCourseLearning((state) => state.fetchEnrolledCourses);
  const enrolledCourses = useCourseLearning((state) => state.enrolledCourses);

  // Auto-open Course Mode if user is enrolled in a course
  useEffect(() => {
    const init = async () => {
      // If we already have a selected course, just open course mode
      if (selectedCourseId) {
        setCourseMode(true);
        return;
      }
      // Otherwise fetch enrollments and auto-open if any exist
      const courses = await fetchEnrolledCourses();
      const hasCourse = (courses && courses.length > 0) || enrolledCourses.length > 0;
      if (hasCourse) {
        setCourseMode(true);
      }
    };
    init();
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-110px)] h-[calc(100dvh-110px)] bg-black overflow-hidden flex flex-col overscroll-none">
      {/* 3D AI Teacher scene — takes all remaining height */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <Experience />
      </div>

      {/* Course Learning Panel — slides in below the 3D scene when Course Mode is active */}
      {isCourseMode && (
        <CourseLearningPanel />
      )}
    </div>
  );
};

export default AITeacherPage;
