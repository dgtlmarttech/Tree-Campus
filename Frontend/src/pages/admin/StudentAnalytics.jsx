import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import api from '../../services/api';
import { FiSearch, FiTrash2, FiEdit2, FiEye, FiMail, FiPhone, FiBook, FiAward, FiCalendar, FiUser, FiFilter, FiGlobe, FiSmartphone, FiShield, FiClock, FiHash, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const StudentAnalytics = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEnrollment, setFilterEnrollment] = useState('all');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [stats, setStats] = useState({
    activeStudents: 0,
    totalEnrollments: 0,
    certificatesIssued: 0
  });
  const [searching, setSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Certificate modal state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [certLoading, setCertLoading] = useState(false);
  const [certSearch, setCertSearch] = useState('');
  const [certPage, setCertPage] = useState(1);
  const [certTotalPages, setCertTotalPages] = useState(1);
  const [certTotal, setCertTotal] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents(1, true); // Search starts from page 1 in background
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    fetchStudents(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchStudents(1);
    }
  }, [filterStatus, filterEnrollment, filterFromDate, filterToDate]);

  const fetchStudents = async (page = 1, isBackground = false) => {
    try {
      if (isBackground) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      let url = `/students?page=${page}&limit=10&search=${searchTerm}&status=${filterStatus}&enrollment=${filterEnrollment}`;
      if (filterFromDate) url += `&fromDate=${filterFromDate}`;
      if (filterToDate) url += `&toDate=${filterToDate}`;

      const response = await api.get(url);
      setStudents(response.data.data || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalStudents(response.data.totalStudents || 0);
      setCurrentPage(response.data.currentPage || 1);
      setStats({
        activeStudents: response.data.activeStudents || 0,
        totalEnrollments: response.data.totalEnrollments || 0,
        certificatesIssued: response.data.certificatesIssued || 0
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
      setSearching(false);
      setIsInitialLoad(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      setStudents(prev => prev.filter(s => s._id !== id));
      try {
        await api.delete(`/students/${id}`);
        toast.success('Student deleted successfully');
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error('Failed to delete student');
        fetchStudents(currentPage);
      }
    }
  };

  const handleSendNudge = async (student) => {
    if (!student.email) {
      toast.error('Student does not have an email address');
      return;
    }
    try {
      toast.loading(`Sending enrollment nudge to ${student.name || 'student'}...`, { id: 'nudge-toast' });
      await api.post(`/students/${student._id}/nudge`);
      toast.success(`Enrollment nudge email sent to ${student.name || student.email}`, { id: 'nudge-toast' });
      setStudents(prev => prev.map(s => s._id === student._id ? { ...s, enrollmentNudgeSent: true } : s));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send nudge email', { id: 'nudge-toast' });
    }
  };

  const handleBulkNudge = async () => {
    if (!window.confirm('Send Course Enrollment Nudge email to all unenrolled students who have not been nudged yet?')) {
      return;
    }
    try {
      toast.loading('Sending bulk enrollment nudges...', { id: 'bulk-nudge-toast' });
      const res = await api.post('/students/bulk-nudge', { limit: 50 });
      toast.success(res.data.message || 'Bulk nudges processed', { id: 'bulk-nudge-toast' });
      fetchStudents(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send bulk nudges', { id: 'bulk-nudge-toast' });
    }
  };

  const handleExportStudents = async () => {
    try {
      toast.loading('Preparing student export...', { id: 'export-toast' });

      const response = await api.get('/students/export');
      const allStudents = response.data.data || [];

      if (allStudents.length === 0) {
        toast.error('No students to export', { id: 'export-toast' });
        return;
      }

      // CSV Escape helper function to prevent broken columns/rows due to commas or quotes
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).trim();
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      // Create CSV content with all user details
      const headers = [
        'Student ID',
        'Name',
        'Email',
        'Phone',
        'Age',
        'Education',
        'Enrollments',
        'Certificates',
        'Joined Date',
        'Platform',
        'Status'
      ];

      const csvContent = [
        headers.join(','),
        ...allStudents.map(student => [
          escapeCSV(student._id),
          escapeCSV(student.name || 'Unknown'),
          escapeCSV(student.email || 'N/A'),
          escapeCSV(student.phone || 'N/A'),
          escapeCSV(student.age || 'N/A'),
          escapeCSV(student.education || 'N/A'),
          student.enrollmentCount || 0,
          student.certificateCount || 0,
          escapeCSV(student.joinedDate ? new Date(student.joinedDate).toLocaleDateString() : 'N/A'),
          escapeCSV(student.platform || 'N/A'),
          escapeCSV(student.status || 'Inactive')
        ].join(','))
      ].join('\n');

      // Create blob with UTF-8 BOM to ensure correct encoding in Excel
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `total_students_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported ${allStudents.length} students successfully`, { id: 'export-toast' });
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error('Failed to export total students', { id: 'export-toast' });
    }
  };

  const handleViewStudent = async (student) => {
    setViewModalOpen(true);
    setViewLoading(true);
    try {
      const response = await api.get(`/students/${student._id}`);
      setViewStudent(response.data.data);
    } catch (error) {
      console.error('Error fetching student details:', error);
      setViewStudent(student);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;

    try {
      setSavingEdit(true);
      await api.put(`/students/${selectedStudent._id}`, editFormData);
      fetchStudents(currentPage);
      setEditModalOpen(false);
      setSelectedStudent(null);
      toast.success('Student updated successfully');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ── Certificate Modal Functions ──
  const fetchCertificates = async (page = 1) => {
    try {
      setCertLoading(true);
      const response = await api.get(`/certificates/admin/all?page=${page}&limit=20&search=${certSearch}`);
      setCertificates(response.data.data || []);
      setCertTotalPages(response.data.totalPages || 1);
      setCertTotal(response.data.total || 0);
      setCertPage(response.data.currentPage || 1);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setCertLoading(false);
    }
  };

  const handleOpenCertModal = () => {
    setCertModalOpen(true);
    setCertSearch('');
    setCertPage(1);
    fetchCertificates(1);
  };

  const handleCertPageChange = (newPage) => {
    setCertPage(newPage);
    fetchCertificates(newPage);
  };

  // Debounced certificate search
  useEffect(() => {
    if (!certModalOpen) return;
    const debounce = setTimeout(() => {
      setCertPage(1);
      fetchCertificates(1);
    }, 400);
    return () => clearTimeout(debounce);
  }, [certSearch]);

  const handleExportCertificates = () => {
    try {
      if (certificates.length === 0) {
        toast.error('No certificates to export');
        return;
      }
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).trim();
        return `"${str.replace(/"/g, '""')}"`;
      };
      const headers = ['Student Name', 'Email', 'Certificate Title', 'Certificate ID', 'Issue Date', 'Grade', 'Score', 'Type'];
      const csvContent = [
        headers.join(','),
        ...certificates.map(cert => [
          escapeCSV(cert.userId?.name || cert.userName || 'N/A'),
          escapeCSV(cert.userId?.email || 'N/A'),
          escapeCSV(cert.courseTitle || cert.courseId?.title || 'N/A'),
          escapeCSV(cert.certificateNumber || 'N/A'),
          escapeCSV(cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'),
          escapeCSV(cert.grade || 'N/A'),
          cert.score ?? 'N/A',
          escapeCSV(cert.type || 'N/A')
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificates_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Certificates exported successfully');
    } catch (error) {
      toast.error('Failed to export certificates');
    }
  };

  // Note: status filtering is now handled server-side (optional implementation in controller)
  // For now, we'll keep the variable but it's passed to the API.
  const filteredStudents = students;

  if (isInitialLoad && loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Board</h1>
            <p className="text-gray-600">Manage registered students and their progress</p>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center space-x-3">
            <button 
              onClick={handleBulkNudge} 
              className="inline-flex items-center space-x-2 bg-amber-600 text-white px-5 py-3 rounded-lg hover:bg-amber-700 transition-colors shadow-sm text-sm font-medium"
              title="Send enrollment encouragement email to unenrolled students"
            >
              <FiMail className="w-4 h-4" />
              <span>Nudge Unenrolled</span>
            </button>
            <button onClick={handleExportStudents} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">
              Export Students
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{totalStudents}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.activeStudents}
            </div>
            <div className="text-sm text-gray-600">Active Students</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {stats.totalEnrollments}
            </div>
            <div className="text-sm text-gray-600">Total Enrollments</div>
          </div>
          <div
            onClick={handleOpenCertModal}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center cursor-pointer hover:border-amber-300 hover:shadow-md hover:bg-amber-50/30 transition-all duration-200 group"
            title="Click to view all certificates"
          >
            <div className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-amber-700 transition-colors">
              {stats.certificatesIssued}
            </div>
            <div className="text-sm text-gray-600 group-hover:text-amber-600 transition-colors flex items-center justify-center gap-1">
              <FiAward className="w-3.5 h-3.5" />
              Certificates Issued
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Filter */}
              <div className="flex items-center space-x-2 border border-gray-300 rounded-lg px-2 bg-white">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">From:</span>
                  <input
                    type="date"
                    className="px-1 py-2 focus:outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                  />
                </div>
                <div className="h-4 border-r border-gray-300"></div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">To:</span>
                  <input
                    type="date"
                    className="px-1 py-2 focus:outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                  />
                </div>
                {(filterFromDate || filterToDate) && (
                  <button
                    onClick={() => { setFilterFromDate(''); setFilterToDate(''); }}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 flex items-center justify-center ml-1"
                    title="Clear date filters"
                  >
                    <FiXCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-shrink-0"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filterEnrollment}
                onChange={(e) => setFilterEnrollment(e.target.value)}
              >
                <option value="all">Enrollment: All</option>
                <option value="enrolled">Enrolled</option>
                <option value="not_enrolled">Not Enrolled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img
                          src={student.avatar || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(student.name || 'Student')}`}
                          alt={student.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{student.name || 'Unknown Student'}</div>
                          <div className="text-sm text-gray-500">ID: {student._id?.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-gray-900">
                          <FiMail className="w-4 h-4 text-gray-400" />
                          <span>{student.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <FiPhone className="w-4 h-4 text-gray-400" />
                          <span>{student.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                          <FiBook className="w-4 h-4 text-blue-500" />
                          <span>{student.realEnrollmentCount || student.enrolledCourses?.length || 0}</span>
                        </div>
                        {student.enrolledCourses?.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tighter">
                            Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-100 uppercase tracking-tighter">
                            Not Enrolled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FiAward className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {student.certificates?.length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <FiCalendar className="w-4 h-4" />
                        <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${student.platform === 'mobile'
                        ? 'bg-purple-50 text-purple-700 border border-purple-100'
                        : student.platform === 'web'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-gray-50 text-gray-500 border border-gray-100'
                        }`}>
                        {student.platform || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        {(!student.enrolledCourses || student.enrolledCourses.length === 0) && (
                          <button
                            className={`p-2 rounded-lg transition-colors ${
                              student.enrollmentNudgeSent
                                ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                : 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                            }`}
                            onClick={() => handleSendNudge(student)}
                            title={student.enrollmentNudgeSent ? "Enrollment Nudge Already Sent (Click to re-send)" : "Send Course Enrollment Nudge Email"}
                          >
                            <FiMail className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="text-emerald-600 hover:text-emerald-900 transition-colors p-2 hover:bg-emerald-50 rounded-lg"
                          onClick={() => handleViewStudent(student)}
                          title="View Profile"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                          onClick={() => handleEditStudent(student)}
                          title="Edit Student"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-lg"
                          onClick={() => handleDelete(student._id)}
                          title="Delete Student"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {filteredStudents.map((student) => (
              <div key={student._id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <img
                    src={student.avatar || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(student.name || 'Student')}`}
                    alt={student.name}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1">{student.name || 'Unknown Student'}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                      <FiMail className="w-3 h-3" />
                      <span className="truncate">{student.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                      <FiPhone className="w-3 h-3" />
                      <span>{student.phone || 'No phone'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-center ${student.isActive
                          ? 'bg-teal-50 text-teal-700 border border-teal-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                          Account: {student.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-center ${student.enrolledCourses?.length > 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-gray-50 text-gray-500 border border-gray-100'
                          }`}>
                          Activity: {student.enrolledCourses?.length > 0 ? 'Enrolled' : 'Not Enrolled'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-center ${student.platform === 'mobile'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : student.platform === 'web'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-gray-50 text-gray-500 border border-gray-100'
                          }`}>
                          Platform: {student.platform || 'N/A'}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100/50 text-blue-800">
                          <FiBook className="w-3 h-3" />
                          <span>{student.realEnrollmentCount || student.enrolledCourses?.length || 0}</span>
                        </span>
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100/50 text-amber-800">
                          <FiAward className="w-3 h-3" />
                          <span>{student.certificates?.length || 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <FiCalendar className="w-3 h-3" />
                    <span>{new Date(student.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {(!student.enrolledCourses || student.enrolledCourses.length === 0) && (
                      <button
                        className={`p-2 rounded-lg transition-colors ${
                          student.enrollmentNudgeSent
                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            : 'text-amber-600 hover:text-amber-900 hover:bg-amber-50'
                        }`}
                        onClick={() => handleSendNudge(student)}
                        title={student.enrollmentNudgeSent ? "Enrollment Nudge Already Sent (Click to re-send)" : "Send Course Enrollment Nudge Email"}
                      >
                        <FiMail className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      className="text-emerald-600 hover:text-emerald-900 transition-colors p-2 hover:bg-emerald-50 rounded-lg"
                      onClick={() => handleViewStudent(student)}
                      title="View Profile"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                      onClick={() => handleEditStudent(student)}
                      title="Edit Student"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      onClick={() => handleDelete(student._id)}
                      title="Delete Student"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FiUser className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No students have registered yet'
              }
            </p>
            {searchTerm && (
              <button
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                onClick={() => setSearchTerm('')}
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 10, totalStudents)}</span> of{' '}
              <span className="font-medium">{totalStudents}</span> students
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600">Page</span>
                <span className="font-semibold text-gray-900">{currentPage}</span>
                <span className="text-sm text-gray-600">of</span>
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Student"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={editFormData.email}
              onChange={handleEditFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={editFormData.phone}
              onChange={handleEditFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex space-x-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSaveEdit}
            disabled={savingEdit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setEditModalOpen(false)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* View Student Profile Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setViewStudent(null); }}
        title="Student Profile"
        maxWidth="max-w-2xl"
      >
        {viewLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-sm text-gray-500">Loading student profile...</p>
          </div>
        ) : viewStudent ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-5 border-b border-gray-100">
              <img
                src={viewStudent.profilePicture || viewStudent.avatar || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(viewStudent.name || 'Student')}&size=128`}
                alt={viewStudent.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-xl font-bold text-gray-900">{viewStudent.name || 'Unknown Student'}</h2>
                <p className="text-sm text-gray-500 mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                  <FiHash className="w-3.5 h-3.5" />
                  <span className="font-mono">{viewStudent._id}</span>
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${viewStudent.isActive || viewStudent.enrolledCourses?.length > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {viewStudent.isActive || viewStudent.enrolledCourses?.length > 0 ? <FiCheckCircle className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
                    {viewStudent.isActive || viewStudent.enrolledCourses?.length > 0 ? 'Active' : 'Inactive'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${viewStudent.platform === 'mobile'
                    ? 'bg-purple-100 text-purple-700'
                    : viewStudent.platform === 'web'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                    }`}>
                    {viewStudent.platform === 'mobile' ? <FiSmartphone className="w-3 h-3" /> : <FiGlobe className="w-3 h-3" />}
                    {viewStudent.platform || 'N/A'}
                  </span>
                  {viewStudent.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                      <FiShield className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiMail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{viewStudent.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FiPhone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{viewStudent.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Age</p>
                    <p className="text-sm font-medium text-gray-900">{viewStudent.age || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FiBook className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Education</p>
                    <p className="text-sm font-medium text-gray-900">{viewStudent.education || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <FiCalendar className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(viewStudent.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Learning Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <FiBook className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-blue-700">{viewStudent.realEnrollmentCount || viewStudent.enrolledCourses?.length || 0}</p>
                  <p className="text-xs text-blue-600 font-medium">Enrollments</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <FiAward className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-amber-700">{viewStudent.certificates?.length || 0}</p>
                  <p className="text-xs text-amber-600 font-medium">Certificates</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                  <FiCheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1.5" />
                  <p className="text-2xl font-bold text-green-700">{viewStudent.completedLessons?.length || 0}</p>
                  <p className="text-xs text-green-600 font-medium">Lessons Done</p>
                </div>
              </div>
            </div>

            {/* Enrolled Courses */}
            {viewStudent.enrolledCourses?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Enrolled Courses</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {viewStudent.enrolledCourses.map((enrollment, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      {enrollment.courseId?.thumbnail ? (
                        <img src={enrollment.courseId.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FiBook className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {enrollment.courseId?.title || 'Unknown Course'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-600">{enrollment.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <FiClock className="w-3 h-3" />
                  Last updated: {new Date(viewStudent.updatedAt).toLocaleString('en-IN')}
                </span>
                <span className="flex items-center gap-1">
                  <FiShield className="w-3 h-3" />
                  Email: {viewStudent.isVerified ? 'Verified' : 'Unverified'}
                </span>
                <span className="flex items-center gap-1">
                  <FiPhone className="w-3 h-3" />
                  Phone: {viewStudent.isPhoneVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Certificates Modal */}
      <Modal
        isOpen={certModalOpen}
        onClose={() => { setCertModalOpen(false); setCertificates([]); setCertSearch(''); }}
        title="Certificates Issued"
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          {/* Search and Export Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
                placeholder="Search by student name, email, certificate ID..."
                value={certSearch}
                onChange={(e) => setCertSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap">
                {certTotal} total
              </span>
              <button
                onClick={handleExportCertificates}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <FiDownload className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Certificates Table  */}
          {certLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mb-3"></div>
              <p className="text-sm text-gray-500">Loading certificates...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-16">
              <FiAward className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No certificates found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Certificate Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Certificate ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {certificates.map((cert) => (
                      <tr key={cert._id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(cert.userId?.name || cert.userName || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[140px]">
                              {cert.userId?.name || cert.userName || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 truncate max-w-[180px] inline-block">
                            {cert.courseTitle || cert.courseId?.title || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                            {cert.certificateNumber || 'N/A'}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600 truncate max-w-[160px] inline-block">
                            {cert.userId?.email || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                            <FiCheckCircle className="w-3 h-3" />
                            Issued
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {certificates.map((cert) => (
                  <div key={cert._id} className="border border-gray-200 rounded-xl p-4 space-y-3 hover:border-amber-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(cert.userId?.name || cert.userName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{cert.userId?.name || cert.userName || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{cert.userId?.email || 'N/A'}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-50 text-green-700 border border-green-200">
                        <FiCheckCircle className="w-2.5 h-2.5" />
                        Issued
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-400 mb-0.5">Certificate</p>
                        <p className="text-gray-800 font-medium truncate">{cert.courseTitle || cert.courseId?.title || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-0.5">Issue Date</p>
                        <p className="text-gray-800 font-medium">
                          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-400 mb-0.5">Certificate ID</p>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                          {cert.certificateNumber || 'N/A'}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {certTotalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-500">
                    Page <span className="font-semibold text-gray-700">{certPage}</span> of{' '}
                    <span className="font-semibold text-gray-700">{certTotalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCertPageChange(certPage - 1)}
                      disabled={certPage === 1}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handleCertPageChange(certPage + 1)}
                      disabled={certPage === certTotalPages}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default StudentAnalytics;