import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiSearch,
  FiEye,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiUsers,
  FiTrash2,
  FiPlay,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiDownload
} from 'react-icons/fi';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getDownloadUrl = (url) => {
  if (!url) return '';
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
};

const TeacherManagement = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchApplications();
  }, [filter, page]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/teachers?page=${page}&limit=${limit}${statusParam}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const { data, total, pages } = response.data;
      setApplications(data || []);
      setTotalItems(total || 0);
      setTotalPages(pages || 1);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching teacher applications:', error);
      toast.error('Failed to load teacher applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE_URL}/teachers/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      await fetchApplications();
      setSelectedApp(null);
      setConfirmModal(null);
      toast.success(`Application status updated to "${status}" successfully!`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_BASE_URL}/teachers/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      await fetchApplications();
      setConfirmModal(null);
      setSelectedApp(null);
      toast.success('Teacher application deleted successfully!');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete application.');
    }
  };

  // Search logic (Client-side search within the current loaded page)
  const filteredApps = applications.filter((app) =>
    app.name?.toLowerCase().includes(search.toLowerCase()) ||
    app.email?.toLowerCase().includes(search.toLowerCase()) ||
    app.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="p-2 bg-teal-50 text-[#14B8A6] rounded-xl"><FiUsers size={24} /></span>
              Teacher Applications
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Review and manage pending candidate registrations, portfolios, and demo videos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-semibold">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchApplications}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-all active:scale-95 border border-gray-200"
              title="Refresh Data"
            >
              <FiRefreshCw className={`${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: 'Total Verified', val: totalItems, bg: 'bg-teal-50 text-teal-700 border-teal-100', dot: 'bg-teal-500' },
            { label: 'Pending Review', val: applications.filter(a => a.status === 'pending').length, bg: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
            { label: 'Approved Teachers', val: applications.filter(a => a.status === 'approved').length, bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
            { label: 'Rejected Entries', val: applications.filter(a => a.status === 'rejected').length, bg: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' }
          ].map((stat, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border bg-white flex items-center justify-between shadow-sm`}>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{stat.val}</h3>
              </div>
              <div className={`w-3 h-3 rounded-full ${stat.dot} animate-pulse`} />
            </div>
          ))}
        </div>

        {/* Filtering & Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          {/* Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            {[
              { id: 'all', label: 'All Applications' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilter(tab.id);
                  setPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  filter === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm w-full">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none transition-all bg-gray-50/50"
            />
          </div>
        </div>

        {/* Table & List View */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-gray-500">Loading Applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">📭</span>
              <p className="text-sm font-bold">No verified teacher applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Applied Date</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredApps.map((app) => (
                    <tr key={app._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-900">{app.name}</td>
                      <td className="py-4 px-6">
                        <div className="text-gray-900 font-semibold">{app.email}</div>
                        <div className="text-xs text-gray-500 mt-0.5">+91 {app.phone}</div>
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">
                        {new Date(app.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize ${
                            app.status === 'approved'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : app.status === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="p-2 hover:bg-teal-50 text-[#14B8A6] rounded-lg transition-colors border border-transparent hover:border-teal-100"
                            title="View Full Application"
                          >
                            <FiEye size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({ type: 'delete', id: app._id })}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Delete"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">
                Page {page} of {totalPages} ({totalItems} items)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Details Portfolio Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Teacher Portfolio: ${selectedApp.name}`}
          size="lg"
        >
          <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Applicant Meta Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
              <div>
                <span className="block text-xs text-gray-400 font-bold uppercase">Teacher Email</span>
                <span className="font-bold text-gray-900 mt-1 block break-all">{selectedApp.email}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 font-bold uppercase">Phone Number</span>
                <span className="font-bold text-gray-900 mt-1 block">+91 {selectedApp.phone}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 font-bold uppercase">Applied Date</span>
                <span className="font-bold text-gray-900 mt-1 block">
                  {new Date(selectedApp.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Embedded 1-Min Demo Video Player */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FiPlay className="text-[#14B8A6]" /> 1-Minute Demo Video
                </h4>
                <a
                  href={getDownloadUrl(selectedApp.demoVideo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#14B8A6] hover:text-[#0F766E] border border-teal-100 bg-teal-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Download Video"
                >
                  <FiDownload /> Download Video
                </a>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-md border border-gray-200">
                <video
                  src={selectedApp.demoVideo}
                  controls
                  className="w-full h-full object-contain"
                  poster="https://images.unsplash.com/photo-1488190211105-8b3e6585d11b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
                />
              </div>
            </div>

            {/* Resume Embed / Portfolio Action */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <FiFileText className="text-[#14B8A6]" /> Resume Portfolio
                </h4>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedApp.resume}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#14B8A6] hover:text-[#0F766E] border border-teal-100 bg-teal-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <FiEye /> Open in New Tab
                  </a>
                  <a
                    href={getDownloadUrl(selectedApp.resume)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-white hover:bg-[#0F766E] bg-[#14B8A6] px-3 py-1 rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                    title="Download Resume"
                  >
                    <FiDownload /> Download Resume
                  </a>
                </div>
              </div>

              {/* Preview container */}
              {selectedApp.resumeResourceType === 'image' || /\.(jpg|jpeg|png|webp|gif)/i.test(selectedApp.resume) ? (
                <div className="w-full h-[350px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm relative flex items-center justify-center p-2">
                  <img
                    src={selectedApp.resume}
                    alt="Resume Portfolio"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-full h-[350px] border border-gray-200 rounded-xl overflow-hidden bg-gray-100 shadow-sm relative">
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedApp.resume)}&embedded=true`}
                    className="w-full h-full border-none"
                    title="Resume Viewer"
                  />
                </div>
              )}
            </div>

            {/* Action Dialog Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-5 border-gray-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                Current Status:
                <span
                  className={`px-3 py-0.5 rounded-full text-xs font-extrabold capitalize ${
                    selectedApp.status === 'approved'
                      ? 'bg-green-50 text-green-700'
                      : selectedApp.status === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedApp.status}
                </span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                {selectedApp.status !== 'rejected' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedApp._id, 'rejected')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <FiX /> Reject Candidate
                  </button>
                )}
                {selectedApp.status !== 'approved' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedApp._id, 'approved')}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <FiCheck /> Approve Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Deletion Modal */}
      {confirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-5 text-center">
            <span className="text-4xl block">⚠️</span>
            <h4 className="text-lg font-bold text-gray-900">Are you absolutely sure?</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              This action will permanently delete the candidate's database record and remove all hosted media files (Resume & Video intro) from Cloudinary. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmModal.id)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all text-sm cursor-pointer"
              >
                Delete Application
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default TeacherManagement;
