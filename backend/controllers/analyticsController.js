import User from '../models/User.js';
import Course from '../models/Course.js';
import Blog from '../models/Blog.js';
import LiveClass from '../models/LiveClass.js';
import Enrollment from '../models/Enrollment.js';
import Certificate from '../models/Certificate.js';

// @desc    Get dashboard overview
// @route   GET /api/analytics/overview
// @access  Private/Admin
export const getOverview = async (req, res) => {
  try {
    // --- Real counts (ALL data, no filters that hide records) ---
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    const totalBlogs = await Blog.countDocuments();
    const totalLiveClasses = await LiveClass.countDocuments();

    // Published vs draft counts for extra info
    const publishedCourses = await Course.countDocuments({ isPublished: true });
    const draftCourses = totalCourses - publishedCourses;
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = totalBlogs - publishedBlogs;

    // --- Real growth: students joined this month vs last month ---
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const studentsThisMonth = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: startOfThisMonth }
    });
    const studentsLastMonth = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
    });

    // Courses created this month vs last
    const coursesThisMonth = await Course.countDocuments({
      createdAt: { $gte: startOfThisMonth }
    });
    const coursesLastMonth = await Course.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
    });

    // Blogs this month vs last
    const blogsThisMonth = await Blog.countDocuments({
      createdAt: { $gte: startOfThisMonth }
    });
    const blogsLastMonth = await Blog.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
    });

    // Live classes this month vs last
    const liveClassesThisMonth = await LiveClass.countDocuments({
      createdAt: { $gte: startOfThisMonth }
    });
    const liveClassesLastMonth = await LiveClass.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
    });

    // Helper: calculate real percentage growth
    const calcGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const pct = Math.round(((current - previous) / previous) * 100);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    // --- ALL students (no limit) ---
    const allStudents = await User.find({ role: 'student' })
      .sort('-createdAt')
      .limit(50)
      .select('name email phone createdAt profilePicture enrolledCourses');

    // --- Categories count ---
    const categories = await Course.distinct('category');
    const categoriesCount = categories.length;

    const ratingAgg = await Course.aggregate([
      { $match: { rating: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);
    const avgRating = ratingAgg.length > 0 ? parseFloat(ratingAgg[0].avg.toFixed(1)) : 0;



    // --- Dynamic Course Stats (with accurate enrollment counts) ---
    const courseStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$enrolledCourses' },
      {
        $group: {
          _id: '$enrolledCourses.courseId',
          count: { $sum: 1 }
        }
      }
    ]);

    const courseStatsMap = new Map(courseStats.map(s => [s._id.toString(), s.count]));

    // --- ALL courses (no limit, no isPublished filter) ---
    const rawCourses = await Course.find()
      .sort('-createdAt')
      .select('title enrollmentCount rating instructor isPublished category thumbnail');

    const allCourses = rawCourses.map(c => {
      const actualEnrollments = courseStatsMap.get(c._id.toString()) || 0;
      // Sync the model count if it's different (optional but good for consistency)
      return {
        ...c.toObject(),
        enrollmentCount: actualEnrollments
      };
    });

    // Re-sort by actual enrollment count for the list
    allCourses.sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    // --- Live classes breakdown ---
    const scheduledClasses = await LiveClass.countDocuments({ status: 'scheduled' });
    const liveNow = await LiveClass.countDocuments({ status: 'live' });
    const completedClasses = await LiveClass.countDocuments({ status: 'completed' });

    // --- Enrollments growth calculation ---
    const enrollThisMonthAgg = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$enrolledCourses' },
      { $match: { 'enrolledCourses.enrolledAt': { $gte: startOfThisMonth } } },
      { $count: 'count' }
    ]);
    const enrollmentsThisMonth = enrollThisMonthAgg[0]?.count || 0;

    const enrollLastMonthAgg = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$enrolledCourses' },
      { $match: { 'enrolledCourses.enrolledAt': { $gte: startOfLastMonth, $lt: startOfThisMonth } } },
      { $count: 'count' }
    ]);
    const enrollmentsLastMonth = enrollLastMonthAgg[0]?.count || 0;

    // --- Peak Enrollment Month Calculation ---
    const peakMonthlyEnrollment = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$enrolledCourses' },
      {
        $group: {
          _id: {
            month: { $month: '$enrolledCourses.enrolledAt' },
            year: { $year: '$enrolledCourses.enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let peakEnrollmentInfo = null;
    if (peakMonthlyEnrollment.length > 0) {
      const peak = peakMonthlyEnrollment[0];
      peakEnrollmentInfo = {
        month: monthNames[peak._id.month - 1],
        year: peak._id.year,
        count: peak.count,
        formatted: `${monthNames[peak._id.month - 1]} ${peak._id.year}`
      };
    }

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalCourses,
          publishedCourses,
          draftCourses,
          totalBlogs,
          publishedBlogs,
          draftBlogs,
          totalLiveClasses,
          scheduledClasses,
          liveNow,
          completedClasses,
          totalEnrollments: courseStats.reduce((sum, s) => sum + s.count, 0),
          avgRating,

          categoriesCount
        },
        growth: {
          students: calcGrowth(studentsThisMonth, studentsLastMonth),
          courses: calcGrowth(coursesThisMonth, coursesLastMonth),
          blogs: calcGrowth(blogsThisMonth, blogsLastMonth),
          liveClasses: calcGrowth(liveClassesThisMonth, liveClassesLastMonth),
          enrollments: calcGrowth(enrollmentsThisMonth, enrollmentsLastMonth),
          peakEnrollment: peakEnrollmentInfo,
          studentsThisMonth,
          coursesThisMonth,
          blogsThisMonth,
          liveClassesThisMonth,
          enrollThisMonth: enrollmentsThisMonth
        },
        recentStudents: allStudents,
        allCourses: allCourses
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get course analytics
// @route   GET /api/analytics/courses
// @access  Private/Admin
export const getCourseAnalytics = async (req, res) => {
  try {
    const courseStats = await Course.find()
      .select('title enrollmentCount rating category')
      .sort('-enrollmentCount');

    res.status(200).json({
      success: true,
      data: courseStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get enrollment analytics
// @route   GET /api/analytics/enrollments
// @access  Private/Admin
export const getEnrollmentAnalytics = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentStats = await User.aggregate([
      { $match: { role: 'student' } },
      { $unwind: '$enrolledCourses' },
      { $match: { 'enrolledCourses.enrolledAt': { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $month: '$enrolledCourses.enrolledAt' },
            year: { $year: '$enrolledCourses.enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const enrollmentData = enrollmentStats.map(stat => ({
      month: `${monthNames[stat._id.month - 1]} ${stat._id.year}`,
      enrollments: stat.count
    }));

    res.status(200).json({
      success: true,
      data: enrollmentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get daily student registrations for the last 30 days
// @route   GET /api/analytics/registrations
// @access  Private/Admin
export const getRegistrationAnalytics = async (req, res) => {
  try {
    const timeZone = 'Asia/Kolkata';
    const now = new Date();
    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    const dateValues = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
    const year = Number(dateValues.year);
    const month = Number(dateValues.month);
    const day = Number(dateValues.day);
    const utcOffsetMs = 5.5 * 60 * 60 * 1000;
    const startDate = new Date(Date.UTC(year, month - 1, day - 29) - utcOffsetMs);
    const endDate = new Date(Date.UTC(year, month - 1, day + 1) - utcOffsetMs);

    const registrationStats = await User.aggregate([
      {
        $match: {
          role: 'student',
          createdAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: timeZone
            }
          },
          registrations: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const registrationsByDate = new Map(
      registrationStats.map(({ _id, registrations }) => [_id, registrations])
    );
    const data = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1, day - 29 + index));
      const dateKey = date.toISOString().slice(0, 10);
      return {
        date: dateKey,
        registrations: registrationsByDate.get(dateKey) || 0
      };
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Registration analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get monthly certificate issuance for the last 6 calendar months
// @route   GET /api/analytics/certificates
// @access  Private/Admin
export const getCertificateAnalytics = async (req, res) => {
  try {
    const timeZone = 'Asia/Kolkata';
    const monthParts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit'
    }).formatToParts(new Date());
    const monthValues = Object.fromEntries(monthParts.map(({ type, value }) => [type, value]));
    const year = Number(monthValues.year);
    const month = Number(monthValues.month);
    const utcOffsetMs = 5.5 * 60 * 60 * 1000;
    const startDate = new Date(Date.UTC(year, month - 6, 1) - utcOffsetMs);
    const endDate = new Date(Date.UTC(year, month, 1) - utcOffsetMs);

    const certificateStats = await Certificate.aggregate([
      {
        $match: {
          issuedAt: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$issuedAt',
              timezone: timeZone
            }
          },
          certificates: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const certificatesByMonth = new Map(
      certificateStats.map(({ _id, certificates }) => [_id, certificates])
    );
    const data = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(
        year,
        month - 6 + index,
        1
      ));
      const monthKey = monthDate.toISOString().slice(0, 7);
      return {
        month: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone
        }).format(monthDate),
        certificates: certificatesByMonth.get(monthKey) || 0
      };
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Certificate analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
