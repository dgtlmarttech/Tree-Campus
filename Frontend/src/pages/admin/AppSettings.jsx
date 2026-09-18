import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { toast } from 'react-hot-toast';

const AppSettings = () => {
  const [whatsappLink, setWhatsappLink] = useState('');
  const [isWhatsappEnabled, setIsWhatsappEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/config/whatsapp');
      if (res.data) {
        setWhatsappLink(res.data.link || '');
        setIsWhatsappEnabled(res.data.isEnabled || false);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isWhatsappEnabled && !whatsappLink.includes('whatsapp.com')) {
      toast.error('Please enter a valid WhatsApp link');
      return;
    }

    try {
      setIsSaving(true);
      await api.put('/config/whatsapp', {
        link: whatsappLink,
        isEnabled: isWhatsappEnabled
      });
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryDark"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">App Settings</h1>

      <div className="bg-white rounded-lg shadow-sm border p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">WhatsApp Community</h2>
        
        <form onSubmit={handleSave}>
          <div className="mb-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isWhatsappEnabled}
                onChange={(e) => setIsWhatsappEnabled(e.target.checked)}
                className="w-5 h-5 text-primaryDark rounded border-gray-300 focus:ring-primaryDark"
              />
              <span className="text-gray-700 font-medium">Enable WhatsApp Community Link in Mobile App</span>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              WhatsApp Link
            </label>
            <input
              type="url"
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
              disabled={!isWhatsappEnabled}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primaryDark disabled:bg-gray-100 disabled:text-gray-500"
              required={isWhatsappEnabled}
            />
            <p className="text-sm text-gray-500 mt-2">
              This link will be used across the mobile app for the community banner.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#0F766E] hover:bg-[#0d635c] text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </form>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default AppSettings;
