    import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Sidebar from '../../components/Layout/Sidebar';

const AdminNotificationManagement = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [targetScreen, setTargetScreen] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState('all');
  const [targetDay, setTargetDay] = useState('');
  const [userIds, setUserIds] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/admin/notifications`, {
        withCredentials: true
      });
      if (data.success) {
        setHistory(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message || !type || !target) {
      return toast.error('Please fill all required fields');
    }

    if (target === 'journey' && !targetDay) {
      return toast.error('Please specify the Learning Journey Day');
    }

    if ((target === 'specific' || target === 'selected') && !userIds) {
      return toast.error('Please specify comma-separated user IDs');
    }

    setIsSending(true);

    try {
      let parsedUserIds = [];
      if (userIds) {
        parsedUserIds = userIds.split(',').map(id => id.trim()).filter(id => id);
      }

      const payload = {
        title,
        message,
        type,
        targetScreen,
        imageUrl,
        target,
        targetDay: target === 'journey' ? parseInt(targetDay, 10) : undefined,
        userIds: parsedUserIds
      };

      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/admin/notifications/send`, payload, {
        withCredentials: true
      });

      if (data.success) {
        toast.success(`Notification sent to ${data.data.recipientCount} users!`);
        fetchHistory();
        // Reset form
        setTitle('');
        setMessage('');
        setTargetScreen('');
        setImageUrl('');
        setTargetDay('');
        setUserIds('');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8 ml-64 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Push Notification Management</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Send New Notification</h2>
          
          <form onSubmit={handleSend} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Notification Title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="general">General</option>
                  <option value="live_class">Live Class</option>
                  <option value="learning_journey">Learning Journey</option>
                  <option value="assignment">Assignment / Quiz</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  rows="3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Notification Message Body"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="all">All Users</option>
                  <option value="journey">Filtered by 90-Day Journey Day</option>
                  <option value="selected">Selected/Specific Users</option>
                </select>
              </div>

              {target === 'journey' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Learning Journey Day * (e.g. 1-90)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={targetDay}
                    onChange={(e) => setTargetDay(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="Day Number"
                  />
                </div>
              )}

              {target === 'selected' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">User IDs (comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={userIds}
                    onChange={(e) => setUserIds(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                    placeholder="e.g. 64abc123..., 64abc456..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Screen / Deep Link (Optional)</label>
                <input
                  type="text"
                  value={targetScreen}
                  onChange={(e) => setTargetScreen(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g. /zoomMeetings, /dashboard"
                />
                <span className="text-xs text-gray-500 mt-1 block">Leave empty to just open the app</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="https://example.com/image.png"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={isSending}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-8 rounded shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Campaign History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm">
                  <th className="p-3 border-b font-semibold">Date</th>
                  <th className="p-3 border-b font-semibold">Title</th>
                  <th className="p-3 border-b font-semibold">Target</th>
                  <th className="p-3 border-b font-semibold">Recipients</th>
                  <th className="p-3 border-b font-semibold text-green-600">Success</th>
                  <th className="p-3 border-b font-semibold text-red-600">Failed</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-gray-800 font-medium">
                      {item.title}
                      <span className="block text-xs text-gray-500 font-normal mt-0.5">{item.type}</span>
                    </td>
                    <td className="p-3 text-sm text-gray-600 capitalize">
                      {item.target}
                      {item.target === 'journey' && ` (Day ${item.targetDetails})`}
                    </td>
                    <td className="p-3 text-sm font-medium">{item.recipientCount}</td>
                    <td className="p-3 text-sm text-green-600 font-medium">{item.successCount}</td>
                    <td className="p-3 text-sm text-red-600 font-medium">{item.failureCount}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-gray-500">
                      No notifications sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminNotificationManagement;
