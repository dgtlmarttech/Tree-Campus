import React, { useState, useEffect } from 'react';
import { FiSearch, FiAward, FiCheckCircle, FiXCircle, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ExamResults = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assignments/submissions/all');
      setSubmissions(res.data.data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load exam results');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/assignments/submissions/${id}`);
      toast.success('Submission deleted successfully');
      // Remove the deleted submission from the state
      setSubmissions(submissions.filter(sub => sub._id !== id));
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const studentName = sub.userId?.name?.toLowerCase() || '';
    const studentEmail = sub.userId?.email?.toLowerCase() || '';
    const courseTitle = sub.courseId?.title?.toLowerCase() || '';
    const assignmentTitle = sub.assignmentId?.title?.toLowerCase() || '';
    
    const matchesSearch = 
      studentName.includes(searchTerm.toLowerCase()) || 
      studentEmail.includes(searchTerm.toLowerCase()) ||
      courseTitle.includes(searchTerm.toLowerCase()) ||
      assignmentTitle.includes(searchTerm.toLowerCase());
      
    if (filterStatus === 'All') return matchesSearch;
    if (filterStatus === 'Passed') return matchesSearch && sub.passed;
    if (filterStatus === 'Failed') return matchesSearch && !sub.passed;
    
    return matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiAward className="text-teal-600" /> Exam Results
            </h1>
            <p className="text-gray-500 mt-1">View all student exam submissions across courses</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
             {/* Search and filter controls */}
             <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search students, courses..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none w-full sm:w-64"
                />
             </div>
             <select 
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
             >
               <option value="All">All Results</option>
               <option value="Passed">Passed Only</option>
               <option value="Failed">Failed Only</option>
             </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSearch className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No results found</h3>
              <p className="text-gray-500 mt-1">No submissions match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                    <th className="p-4 font-semibold w-12 text-center">S.No</th>
                    <th className="p-4 font-semibold">Student</th>
                    <th className="p-4 font-semibold">Course & Exam</th>
                    <th className="p-4 font-semibold text-center">Score</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Date</th>
                    <th className="p-4 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubmissions.map((sub, index) => (
                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-center text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{sub.userId?.name || 'Unknown Student'}</div>
                        <div className="text-xs text-gray-500">{sub.userId?.email || 'N/A'}</div>
                        {sub.userId?.phone && (
                          <div className="text-xs text-gray-400 mt-0.5">{sub.userId.phone}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-teal-700 line-clamp-1">{sub.courseId?.title || 'Deleted Course'}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{sub.assignmentId?.title || 'Unknown Exam'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-gray-900">{sub.percentageScore}%</span>
                        <div className="text-xs text-gray-500">{sub.totalScore} points</div>
                      </td>
                      <td className="p-4 text-center">
                        {sub.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <FiCheckCircle className="w-3 h-3" /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <FiXCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-sm text-gray-500">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                        <div className="text-xs">{new Date(sub.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(sub._id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                          title="Delete Submission"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ExamResults;
