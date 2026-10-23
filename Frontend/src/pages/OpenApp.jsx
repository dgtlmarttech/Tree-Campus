import React, { useEffect } from 'react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';

const OpenApp = () => {
  useEffect(() => {
    // Instant redirect to Google Play Store app
    window.location.replace(PLAY_STORE_URL);
  }, []);

  return (
    <div className="min-h-screen bg-[#1B4332] flex items-center justify-center p-4 text-white text-center font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-sm w-full bg-white text-slate-800 rounded-3xl p-8 shadow-2xl">
        <img
          src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png"
          alt="Treecampus"
          className="w-20 h-20 mx-auto mb-4 object-contain"
        />
        <h2 className="text-xl font-bold text-[#1B4332] mb-2">Redirecting to Treecampus...</h2>
        <p className="text-sm text-slate-600 mb-6">Opening Google Play Store...</p>
        <a
          href={PLAY_STORE_URL}
          className="block w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-[#FF6B35] to-[#E85D04] text-white font-bold text-sm shadow-md"
        >
          Open in Google Play Store
        </a>
      </div>
    </div>
  );
};

export default OpenApp;
