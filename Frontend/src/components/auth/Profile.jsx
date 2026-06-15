import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { downloadCertificatePDF } from '../../utils/certificateUtils.jsx';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferredLanguage: 'english',
    age: '',
    education: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadingCert, setDownloadingCert] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        preferredLanguage: user.preferredLanguage || 'english',
        age: user.age || '',
        education: user.education || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const updatedUser = await authService.updateProfile(formData);
      if (!updatedUser) throw new Error("Updated user not received from server");

      updateUser(updatedUser);
      setFormData({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        preferredLanguage: updatedUser.preferredLanguage || "english",
        age: updatedUser.age || "",
        education: updatedUser.education || ""
      });

      if (formData.preferredLanguage !== updatedUser.preferredLanguage) {
        localStorage.setItem("preferredLanguage", updatedUser.preferredLanguage);
      }

      setEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      preferredLanguage: user?.preferredLanguage || 'english',
      age: user?.age || '',
      education: user?.education || ''
    });
    setEditing(false);
    setMessage('');
  };

  const handleDownload = async (cert) => {
    setDownloadingCert(cert._id);
    await downloadCertificatePDF(cert, user);
    setDownloadingCert(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Section */}
          <div className="bg-slate-800 px-8 py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-slate-700 rounded-full opacity-20 blur-3xl"></div>
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-3xl font-bold text-slate-800 shadow-md border-4 border-slate-700/50">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-center sm:text-left text-white mt-2 sm:mt-0">
                <h1 className="text-2xl font-bold tracking-tight">{user?.name || 'User'}</h1>
                <p className="text-slate-300 font-medium text-sm mt-1">{user?.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                  </div>
                  {user?.role && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-200 border border-slate-600/50 capitalize">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                message.includes('success') 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message}
              </div>
            )}

            {!editing ? (
              <div className="space-y-8">
                {/* Personal Information */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-slate-800">Personal Information</h2>
                    <button
                      onClick={() => setEditing(true)}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Phone Number</p>
                      <p className="text-slate-900">{user?.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Age</p>
                      <p className="text-slate-900">{user?.age ? `${user.age} years` : 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Education</p>
                      <p className="text-slate-900">{user?.education || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Preferred Language</p>
                      <p className="text-slate-900 capitalize">{user?.preferredLanguage || 'English'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Account Status</p>
                      <div className="flex items-center">
                        {user?.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Verified
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-amber-600 font-medium">Unverified</span>
                            <button
                              onClick={() => navigate('/verify-otp', { state: { email: user.email, phone: user.phone, mode: 'register', triggerAutoResend: true } })}
                              className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
                            >
                              Verify Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Stats Section */}
                {(user?.enrolledCourses?.length > 0 || user?.completedLessons?.length > 0) && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-5">Learning Progress</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user?.enrolledCourses?.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xl">
                            📚
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Enrolled Courses</p>
                            <p className="text-2xl font-bold text-slate-900">{user.enrolledCourses.length}</p>
                          </div>
                        </div>
                      )}
                      {user?.completedLessons?.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xl">
                            ✅
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-500">Completed Lessons</p>
                            <p className="text-2xl font-bold text-slate-900">{user.completedLessons.length}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Certificates Section */}
                {user?.certificates?.length > 0 && (
                  <>
                    <hr className="border-slate-100" />
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 mb-5">Earned Certificates</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.certificates.map((cert) => (
                          <div key={cert._id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">{cert.courseTitle || 'Course Certificate'}</h3>
                              <p className="text-sm text-slate-500 mt-1">Issued: {new Date(cert.issuedAt || cert.createdAt).toLocaleDateString()}</p>
                              <p className="text-xs text-slate-400 font-mono mt-1">ID: {cert.certificateNumber}</p>
                            </div>
                            <button
                              onClick={() => handleDownload(cert)}
                              disabled={downloadingCert === cert._id}
                              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {downloadingCert === cert._id ? (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                              )}
                              {downloadingCert === cert._id ? 'Downloading...' : 'Download Certificate'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Edit Form */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Edit Profile</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        className="w-full px-4 py-2.5 bg-slate-100 text-slate-500 border border-slate-300 rounded-lg outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        className="w-full px-4 py-2.5 bg-slate-100 text-slate-500 border border-slate-300 rounded-lg outline-none cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Education</label>
                      <input
                        type="text"
                        name="education"
                        value={formData.education}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Language</label>
                      <select
                        name="preferredLanguage"
                        value={formData.preferredLanguage}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 focus:border-slate-800 outline-none transition-all"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-4 pt-4 mt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
