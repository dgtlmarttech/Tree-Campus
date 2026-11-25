import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import api from '../../services/api';
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiUsers, FiBook, FiAward, FiTrendingUp, FiLayers } from 'react-icons/fi';

const Analytics = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up real-time refresh every 30 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchAnalyticsData();
    }, 30000);
    
    // Fetch student details if studentId is provided
    if (studentId) {
      fetchStudentData(studentId);
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [studentId]);

  const fetchAnalyticsData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Get overview and trend data concurrently
      const [overviewRes, enrollmentRes, registrationRes, certificateRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/enrollments'),
        api.get('/analytics/registrations'),
        api.get('/analytics/certificates')
      ]);
      
      const overviewData = overviewRes.data.data;
      const enrollmentTrend = enrollmentRes.data.data;
      const registrationTrend = registrationRes.data.data;
      const certificateTrend = certificateRes.data.data;
      
      // Generate analytics data using real trend data
      const generatedData = processAnalyticsData(
        overviewData,
        enrollmentTrend,
        registrationTrend,
        certificateTrend
      );
      setAnalyticsData(generatedData);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStudentData = async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      setSelectedStudent(response.data.data);
    } catch (error) {
      console.error('Error fetching student data:', error);
    }
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  // Process analytics data from API responses
  const processAnalyticsData = (overviewData, enrollmentTrendData, registrationTrendData, certificateTrendData) => {
    if (!overviewData) return null;

    // Use enrollment trend directly from API
    const enrollmentTrend = enrollmentTrendData || [];
    const registrationTrend = registrationTrendData || [];
    const certificateTrend = certificateTrendData || [];

    // Generate enrollment by course data - Filter out 0 enrollments to clean up the graph
    const enrollmentByCourse = (overviewData.allCourses || [])
      .filter(course => (course.enrollmentCount || 0) > 0)
      .map(course => ({
        courseName: course.title || course.name || 'Untitled Course',
        enrollments: course.enrollmentCount || 0
      }))
      .slice(0, 10); // Show top 10 to prevent overcrowding

    return {
      enrollmentTrend,
      registrationTrend,
      certificateTrend,
      enrollmentByCourse,
      overview: overviewData
    };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const { enrollmentTrend, registrationTrend, certificateTrend, enrollmentByCourse } = analyticsData || { enrollmentTrend: [], registrationTrend: [], certificateTrend: [], enrollmentByCourse: [] };
  const registrationsLast30Days = registrationTrend.reduce((total, item) => total + item.registrations, 0);
  const registrationsToday = registrationTrend[registrationTrend.length - 1]?.registrations || 0;
  const enrollmentsInPeriod = enrollmentTrend.reduce((total, item) => total + item.enrollments, 0);
  const latestEnrollmentMonth = enrollmentTrend[enrollmentTrend.length - 1];
  const certificatesInPeriod = certificateTrend.reduce((total, item) => total + item.certificates, 0);
  const latestCertificateMonth = certificateTrend[certificateTrend.length - 1];
  const formatRegistrationDate = (date) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col justify-center items-center min-h-96">
          <p className="text-red-600 mb-4 text-lg">Failed to load analytics data</p>
          <button
            onClick={() => fetchAnalyticsData()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedStudent ? `${selectedStudent.name}'s Analytics` : 'Analytics Dashboard'}
            </h1>
            <p className="text-gray-600 mt-1">
              {selectedStudent 
                ? `Student enrollment and progress tracking` 
                : 'Track your platform\'s performance and growth metrics'}
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            {error && (
              <div className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                {error}
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {/* Student Info Card (if viewing specific student) */}
        {selectedStudent && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm p-6">
            <div className="flex items-center space-x-4">
              <img
                src={selectedStudent.profilePicture || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(selectedStudent.name || 'User')}`}
                alt={selectedStudent.name}
                className="w-16 h-16 rounded-full border-2 border-blue-300"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{selectedStudent.name}</p>
                <p className="text-sm text-gray-600">{selectedStudent.email}</p>
                <p className="text-sm text-gray-600">{selectedStudent.phone || 'No phone'}</p>
              </div>
              <div className="flex items-center space-x-6 text-right">
                <div className="bg-white px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Total Enrollments</p>
                  <p className="text-xl font-bold text-gray-900">{selectedStudent.enrolledCourses?.length || 0}</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm text-gray-600">Joined</p>
                  <p className="font-semibold text-gray-900">{new Date(selectedStudent.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <FiUsers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(analyticsData.overview?.stats?.totalStudents || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Students</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <FiAward className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(analyticsData.overview?.stats?.totalEnrollments || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Enrollments</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center space-x-4">
            <div className="p-3 bg-teal-50 rounded-lg text-teal-600">
              <FiBook className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(analyticsData.overview?.stats?.totalCourses || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Courses</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center space-x-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <FiLayers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {analyticsData.overview?.stats?.categoriesCount || 0}
              </div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center space-x-4">
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <FiTrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {(analyticsData.overview?.growth?.peakEnrollment?.count || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Peak Enrollments</div>
              {analyticsData.overview?.growth?.peakEnrollment?.formatted && (
                <div className="text-[10px] text-rose-500 font-medium">
                  {analyticsData.overview.growth.peakEnrollment.formatted}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily registrations */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-teal-50 p-3 text-teal-700">
                <FiUsers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Daily Registration Trend</h3>
                <p className="mt-1 text-sm text-slate-500">New student sign-ups over the last 30 days</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-2">
                <p className="text-xs font-medium text-slate-500">Last 30 days</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-900">{registrationsLast30Days.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-teal-50 px-4 py-2">
                <p className="text-xs font-medium text-teal-700">Today</p>
                <p className="mt-0.5 text-lg font-semibold text-teal-900">{registrationsToday.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="px-3 pb-5 pt-4 sm:px-6">
            {registrationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={registrationTrend} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="registrationTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatRegistrationDate}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tickMargin={12}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={42}
                  />
                  <Tooltip
                    labelFormatter={(date) => formatRegistrationDate(date)}
                    formatter={(value) => [value, 'Registrations']}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.1)',
                      padding: '10px 14px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fill="url(#registrationTrendFill)"
                    activeDot={{ r: 5, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
                    name="Registrations"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                No registration data available
              </div>
            )}
          </div>
        </div>

        {/* Existing enrollment and category charts sit below the registration trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrollment Trend */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Enrollment Trend</h3>
                <p className="mt-1 text-sm text-slate-500">Monthly course enrollments over the last 6 months</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-3">
                <div className="shrink-0 rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="whitespace-nowrap text-xs font-medium text-indigo-600">6-month total</p>
                  <p className="mt-0.5 whitespace-nowrap text-base font-semibold text-indigo-900">{enrollmentsInPeriod.toLocaleString()}</p>
                </div>
                {latestEnrollmentMonth && (
                  <div className="shrink-0 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500">{latestEnrollmentMonth.month}</p>
                    <p className="mt-0.5 whitespace-nowrap text-base font-semibold text-slate-900">
                      {latestEnrollmentMonth.enrollments.toLocaleString()} enrollments
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-3 pb-5 pt-4 sm:px-5">
              {enrollmentTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={enrollmentTrend} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="enrollmentTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={18}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value) => [value.toLocaleString(), 'Enrollments']}
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.1)',
                        padding: '10px 14px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#enrollmentTrendFill)"
                      activeDot={{ r: 5, fill: '#6366f1', stroke: '#ffffff', strokeWidth: 2 }}
                      name="Enrollments"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No enrollment data available
                </div>
              )}
            </div>
          </div>

          {/* Certificate issuance trend */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Certificates Issued</h3>
                <p className="mt-1 text-sm text-slate-500">Monthly certificates issued over the last 6 months</p>
              </div>
              <div className="flex min-w-0 flex-wrap gap-3">
                <div className="shrink-0 rounded-xl bg-amber-50 px-3 py-2">
                  <p className="whitespace-nowrap text-xs font-medium text-amber-700">6-month total</p>
                  <p className="mt-0.5 whitespace-nowrap text-base font-semibold text-amber-900">
                    {certificatesInPeriod.toLocaleString()}
                  </p>
                </div>
                {latestCertificateMonth && (
                  <div className="shrink-0 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="whitespace-nowrap text-xs font-medium text-slate-500">{latestCertificateMonth.month}</p>
                    <p className="mt-0.5 whitespace-nowrap text-base font-semibold text-slate-900">
                      {latestCertificateMonth.certificates.toLocaleString()} certificates
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-3 pb-5 pt-4 sm:px-5">
              {certificatesInPeriod > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={certificateTrend} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="certificateTrendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.72} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={18}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                    />
                    <Tooltip
                      formatter={(value) => [value.toLocaleString(), 'Certificates']}
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.1)',
                        padding: '10px 14px'
                      }}
                    />
                    <Bar
                      dataKey="certificates"
                      fill="url(#certificateTrendFill)"
                      radius={[7, 7, 0, 0]}
                      maxBarSize={42}
                      name="Certificates"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No certificates issued in the last 6 months
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enrollment by Course */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Enrollments by Course</h3>
              <p className="mt-1 text-sm text-slate-500">Compare enrollment numbers across popular courses</p>
            </div>
            {enrollmentByCourse.length > 0 && (
              <span className="inline-flex w-fit items-center rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                Top {enrollmentByCourse.length} courses
              </span>
            )}
          </div>
          <div className="px-3 py-5 sm:px-6">
          {enrollmentByCourse.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(340, enrollmentByCourse.length * 54)}>
              <BarChart
                data={enrollmentByCourse}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                barCategoryGap="28%"
              >
                <defs>
                  <linearGradient id="courseEnrollmentFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <CartesianGrid horizontal={false} strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickFormatter={(value) => value.toLocaleString()}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  type="category"
                  dataKey="courseName"
                  width={180}
                  tickFormatter={(name) => name.length > 24 ? `${name.slice(0, 22)}...` : name}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.1)',
                    padding: '10px 14px'
                  }}
                  formatter={(value) => [value.toLocaleString(), 'Enrollments']}
                />
                <Bar
                  dataKey="enrollments"
                  fill="url(#courseEnrollmentFill)"
                  radius={[0, 7, 7, 0]}
                  maxBarSize={28}
                  name="Enrollments"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500">
              No enrollment data by course available
            </div>
          )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;