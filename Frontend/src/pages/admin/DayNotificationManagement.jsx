import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Sidebar from '../../components/Layout/Sidebar';

const API = import.meta.env.VITE_API_URL;
const TYPE_LABELS = {
  zoom_info:    { label: '1️⃣ Zoom Class Info',    color: 'bg-blue-100 text-blue-700',    icon: '📚' },
  zoom_started: { label: '2️⃣ Zoom Class Started', color: 'bg-red-100 text-red-700',     icon: '🔴' },
  engagement:   { label: '3️⃣ Engagement',          color: 'bg-green-100 text-green-700', icon: '🗣️' },
};
const TYPES = Object.keys(TYPE_LABELS);

const DayNotificationManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayTemplates, setDayTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', body: '', route: '', isActive: true });
  const [sending, setSending] = useState({});
  const [bulkType, setBulkType] = useState('engagement');
  const [bulkStart, setBulkStart] = useState(1);
  const [bulkEnd, setBulkEnd] = useState(90);
  const [bulkSending, setBulkSending] = useState(false);
  const [searchDay, setSearchDay] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'send' | 'stats'

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/admin/day-notifications/stats`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) setStats(data.stats);
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/day-notifications`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) setTemplates(data.templates);
    } catch (err) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, [fetchTemplates, fetchStats]);

  const selectDay = async (day) => {
    setSelectedDay(day);
    setEditingId(null);
    try {
      const { data } = await axios.get(`${API}/admin/day-notifications/${day}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) setDayTemplates(data.templates);
    } catch {
      toast.error('Failed to load day templates');
    }
  };

  const startEdit = (t) => {
    setEditingId(t._id);
    setEditForm({ title: t.title, body: t.body, route: t.route || '/dashboard', isActive: t.isActive });
  };

  const saveEdit = async (id) => {
    try {
      const { data } = await axios.put(`${API}/admin/day-notifications/${id}`, editForm, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) {
        toast.success('Template saved!');
        setEditingId(null);
        setDayTemplates(prev => prev.map(t => t._id === id ? data.template : t));
        setTemplates(prev => prev.map(t => t._id === id ? data.template : t));
      }
    } catch {
      toast.error('Failed to save template');
    }
  };

  const sendOne = async (day, notificationType) => {
    const key = `${day}-${notificationType}`;
    setSending(prev => ({ ...prev, [key]: true }));
    try {
      const { data } = await axios.post(`${API}/admin/day-notifications/send`, { day, notificationType }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) {
        toast.success(`Sent to ${data.recipientCount} users (${data.successCount} success, ${data.failureCount} failed)`);
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(prev => ({ ...prev, [key]: false }));
    }
  };

  const sendBulk = async () => {
    if (!bulkType || !bulkStart || !bulkEnd) return toast.error('Fill all bulk send fields');
    setBulkSending(true);
    try {
      const { data } = await axios.post(`${API}/admin/day-notifications/send-bulk`, {
        startDay: bulkStart, endDay: bulkEnd, notificationType: bulkType
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, withCredentials: true });
      if (data.success) {
        const sent = data.results.filter(r => r.status === 'sent');
        const total = sent.reduce((s, r) => s + (r.recipientCount || 0), 0);
        toast.success(`Bulk send complete: ${sent.length} days sent, ${total} total recipients`);
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk send failed');
    } finally {
      setBulkSending(false);
    }
  };

  const getUsersOnDay = (day) => stats.find(s => s.day === day)?.userCount || 0;
  const filteredDays = Array.from({ length: 90 }, (_, i) => i + 1).filter(d =>
    searchDay === '' || d.toString().includes(searchDay)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">🔔 90-Day Journey Notifications</h1>
            <p className="text-gray-500 mt-1">Manage and send day-wise notification templates for the 90-day learning journey.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            {[['browse', '📋 Browse & Edit'], ['send', '📤 Send'], ['stats', '📊 Stats']].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── TAB: BROWSE & EDIT ─────────────────────────────── */}
          {activeTab === 'browse' && (
            <div className="flex gap-6">
              {/* Day selector */}
              <div className="w-56 flex-shrink-0">
                <input
                  type="text" placeholder="Search day..."
                  value={searchDay} onChange={e => setSearchDay(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <div className="bg-white border rounded-lg shadow-sm overflow-y-auto max-h-[72vh]">
                  {filteredDays.map(day => (
                    <button key={day} onClick={() => selectDay(day)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-orange-50 border-b last:border-0 ${selectedDay === day ? 'bg-orange-100 text-orange-700 font-semibold' : 'text-gray-700'}`}>
                      <span>Day {day}</span>
                      {getUsersOnDay(day) > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-semibold">{getUsersOnDay(day)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template editor */}
              <div className="flex-1">
                {!selectedDay ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center text-gray-400">
                    <p className="text-4xl mb-3">👈</p>
                    <p className="text-lg font-medium">Select a day to view & edit templates</p>
                    <p className="text-sm mt-1">Each day has 3 notification types</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800">
                        Day {selectedDay} Templates
                        {getUsersOnDay(selectedDay) > 0 && (
                          <span className="ml-3 text-sm bg-orange-100 text-orange-600 rounded-full px-3 py-1 font-semibold">
                            {getUsersOnDay(selectedDay)} users on this day
                          </span>
                        )}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {TYPES.map(type => {
                        const t = dayTemplates.find(t => t.notificationType === type);
                        const isEditing = editingId === t?._id;
                        const key = `${selectedDay}-${type}`;
                        const isSending = !!sending[key];
                        const meta = TYPE_LABELS[type];

                        return (
                          <div key={type} className={`bg-white rounded-xl border shadow-sm p-5 ${!t?.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${meta.color}`}>{meta.label}</span>
                              {t && (
                                <div className="flex gap-2">
                                  {!isEditing ? (
                                    <button onClick={() => startEdit(t)}
                                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
                                      ✏️ Edit
                                    </button>
                                  ) : (
                                    <>
                                      <button onClick={() => saveEdit(t._id)}
                                        className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600">
                                        💾 Save
                                      </button>
                                      <button onClick={() => setEditingId(null)}
                                        className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50 text-gray-600">
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => sendOne(selectedDay, type)}
                                    disabled={isSending || !t?.isActive}
                                    className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSending ? 'Sending...' : `📤 Send to Day ${selectedDay} Users`}
                                  </button>
                                </div>
                              )}
                            </div>

                            {t ? (
                              isEditing ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-xs text-gray-500 font-medium">Title</label>
                                    <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                      className="w-full px-3 py-2 border rounded-md text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 font-medium">Body</label>
                                    <textarea rows={3} value={editForm.body} onChange={e => setEditForm(f => ({ ...f, body: e.target.value }))}
                                      className="w-full px-3 py-2 border rounded-md text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                  </div>
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <label className="text-xs text-gray-500 font-medium">Route / Deep Link</label>
                                      <input value={editForm.route} onChange={e => setEditForm(f => ({ ...f, route: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-md text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                                    </div>
                                    <div className="flex items-end pb-1">
                                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                                          className="rounded" />
                                        Active
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1 font-medium">TITLE</p>
                                    <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                                  </div>
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-1 font-medium">BODY</p>
                                    <p className="text-sm text-gray-700">{t.body}</p>
                                  </div>
                                  <div className="flex gap-4 text-xs text-gray-500">
                                    <span>🔗 Route: <code className="bg-gray-100 px-1 rounded">{t.route || '/dashboard'}</code></span>
                                    <span>{t.isActive ? '✅ Active' : '🚫 Disabled'}</span>
                                    {t.lastSentAt && <span>📤 Last sent: {new Date(t.lastSentAt).toLocaleString()}</span>}
                                  </div>
                                </div>
                              )
                            ) : (
                              <p className="text-sm text-gray-400 italic">No template found. Run seed script to populate.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: SEND ─────────────────────────────────────── */}
          {activeTab === 'send' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Single Day Send */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">📤 Send Single Day Notification</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journey Day (1–90)</label>
                    <input id="single-day-input" type="number" min="1" max="90"
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="e.g. 15"
                      onChange={e => setSelectedDay(parseInt(e.target.value, 10) || null)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                    {TYPES.map(type => (
                      <button key={type} onClick={() => selectedDay && sendOne(selectedDay, type)}
                        disabled={!selectedDay || !!sending[`${selectedDay}-${type}`]}
                        className="w-full flex items-center justify-between px-4 py-3 mb-2 border rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <span className="text-sm font-medium text-gray-700">{TYPE_LABELS[type].label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_LABELS[type].color}`}>
                          {sending[`${selectedDay}-${type}`] ? 'Sending...' : 'Send'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedDay && (
                    <p className="text-xs text-gray-500">
                      👥 Users on Day {selectedDay}: <strong>{getUsersOnDay(selectedDay)}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* Bulk Send */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">📦 Bulk Send (Range of Days)</h2>
                <p className="text-sm text-gray-500 mb-4">Send one notification type to all users across a range of journey days. Each user gets the notification for their own day's template.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                    <select value={bulkType} onChange={e => setBulkType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400">
                      {TYPES.map(t => (
                        <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Day</label>
                      <input type="number" min="1" max="90" value={bulkStart}
                        onChange={e => setBulkStart(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Day</label>
                      <input type="number" min="1" max="90" value={bulkEnd}
                        onChange={e => setBulkEnd(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-sm text-orange-700">
                    ⚠️ This will send <strong>{TYPE_LABELS[bulkType]?.label}</strong> to all users on Days {bulkStart}–{bulkEnd}.
                    <br />Total potential recipients: <strong>{stats.filter(s => s.day >= bulkStart && s.day <= bulkEnd).reduce((sum, s) => sum + s.userCount, 0)}</strong>
                  </div>
                  <button onClick={sendBulk} disabled={bulkSending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
                    {bulkSending ? '⏳ Sending...' : `📤 Send Bulk (Days ${bulkStart}–${bulkEnd})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: STATS ────────────────────────────────────── */}
          {activeTab === 'stats' && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Users per Journey Day</h2>
              {stats.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No progress data available yet.</p>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-9 md:grid-cols-15 gap-2">
                  {Array.from({ length: 90 }, (_, i) => i + 1).map(day => {
                    const count = getUsersOnDay(day);
                    const max = Math.max(...stats.map(s => s.userCount), 1);
                    const intensity = Math.round((count / max) * 5);
                    const colors = ['bg-gray-100', 'bg-orange-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500'];
                    return (
                      <div key={day} title={`Day ${day}: ${count} users`}
                        className={`relative rounded-md p-2 text-center cursor-pointer transition-transform hover:scale-110 ${colors[intensity]}`}
                        onClick={() => { setActiveTab('browse'); selectDay(day); }}>
                        <div className={`text-xs font-bold ${intensity >= 3 ? 'text-white' : 'text-gray-600'}`}>{day}</div>
                        {count > 0 && <div className={`text-xs ${intensity >= 3 ? 'text-orange-100' : 'text-orange-500'}`}>{count}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <span>0 users</span>
                <div className="flex gap-1">
                  {['bg-gray-100','bg-orange-100','bg-orange-200','bg-orange-300','bg-orange-400','bg-orange-500'].map((c,i) => (
                    <div key={i} className={`w-5 h-3 rounded ${c}`} />
                  ))}
                </div>
                <span>Many users</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayNotificationManagement;