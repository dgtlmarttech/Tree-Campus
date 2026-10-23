import React, { useEffect, useState } from 'react';
import { ExternalLink, Download, Globe, Sparkles, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';
const COURSES_URL = 'https://courses.treecampus.in';

// App Custom Scheme & Chrome Intent URLs
const SCHEME_OPEN = 'treecampus://open';
const SCHEME_CALLBACK = 'treecampus://login-callback';
const SCHEME_ROOT = 'treecampus://';
const ANDROID_CHROME_INTENT = `intent://open#Intent;scheme=treecampus;package=com.academy.tree_campus;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;

const OpenApp = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isAndroid: false,
    isIOS: false,
    isDesktop: false,
  });
  const [status, setStatus] = useState('Connecting to Treecampus App...');
  const [showOptions, setShowOptions] = useState(false);

  const attemptLaunch = () => {
    // 1. Try launching via app's custom scheme first
    try {
      window.location.href = SCHEME_OPEN;
    } catch (e) {
      console.warn('Scheme launch error:', e);
    }

    // 2. Try Chrome browsable intent after brief pause
    setTimeout(() => {
      try {
        window.location.href = ANDROID_CHROME_INTENT;
      } catch (e) {
        console.warn('Intent launch error:', e);
      }
    }, 400);
  };

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isDesktop = !isAndroid && !isIOS;

    setDeviceInfo({ isAndroid, isIOS, isDesktop });

    if (isAndroid) {
      setStatus('Opening Treecampus App...');
      // Try opening the app automatically
      const timer = setTimeout(() => {
        attemptLaunch();
      }, 300);

      // If user is still here after 2.5 seconds, reveal alternate options
      const revealTimer = setTimeout(() => {
        setShowOptions(true);
      }, 2500);

      return () => {
        clearTimeout(timer);
        clearTimeout(revealTimer);
      };
    } else if (isIOS) {
      setStatus('Welcome iOS Learner');
    } else {
      setStatus('Welcome Desktop Learner');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#081C15] flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden border border-white/20 animate-fade-in">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo */}
        <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="relative w-24 h-24 rounded-2xl bg-white shadow-lg p-2.5 flex items-center justify-center border border-emerald-100">
            <img
              src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png"
              alt="Treecampus"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#1B4332] border border-emerald-200/60 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          <span>{status}</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1B4332] leading-tight mb-2 tracking-tight">
          Treecampus Learning
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {deviceInfo.isAndroid
            ? 'If your Treecampus app did not launch automatically, tap the button below to open it directly:'
            : 'Access 100% free Spoken English courses, Spokee AI Teacher, and daily interactive Zoom classes.'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Main Launch Button */}
          <button
            type="button"
            onClick={attemptLaunch}
            id="open-app-primary-btn"
            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-white font-bold text-[15px] bg-gradient-to-r from-[#FF6B35] to-[#E85D04] hover:from-[#E85D04] hover:to-[#D9480F] shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Smartphone className="w-5 h-5" />
            <span>📲 Open Treecampus App</span>
          </button>

          {/* Alternate launch options (shown if needed or toggled) */}
          {(showOptions || deviceInfo.isAndroid) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-2 text-xs">
              <div className="font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>App Link Launchers:</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Tap to launch</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={SCHEME_OPEN}
                  className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 p-2 rounded-xl text-center font-bold transition-colors"
                >
                  🚀 Mode 1 (App Open)
                </a>
                <a
                  href={SCHEME_CALLBACK}
                  className="bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 p-2 rounded-xl text-center font-bold transition-colors"
                >
                  ⚡ Mode 2 (Deep Link)
                </a>
              </div>
              <a
                href={ANDROID_CHROME_INTENT}
                className="block bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 p-2 rounded-xl text-center font-bold transition-colors"
              >
                📱 Mode 3 (Android Chrome Intent)
              </a>
            </div>
          )}

          {/* Secondary Action: Play Store */}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="open-playstore-btn"
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl text-slate-800 font-semibold text-sm bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Download on Google Play</span>
          </a>

          {/* Tertiary Action: Web */}
          <a
            href={COURSES_URL}
            id="continue-web-btn"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-slate-500 hover:text-emerald-800 font-semibold text-xs transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Continue on Website (courses.treecampus.in)</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </a>
        </div>

        {/* Value Highlights */}
        <div className="bg-[#F8FAF9] rounded-2xl p-3.5 border border-[#E5EBE7] text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>100% Free 30-Day Spoken English Course</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>3 Daily Free Live Zoom Classes (Hindi & Bengali)</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Spokee — 24/7 Conversational AI English Mentor</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-[11px] text-slate-400 font-medium">
          Treecampus • Democratizing Quality Education at No Cost
        </p>
      </div>
    </div>
  );
};

export default OpenApp;
