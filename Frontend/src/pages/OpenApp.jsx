import React, { useEffect, useState } from 'react';
import { ExternalLink, Download, Globe, Sparkles, Smartphone, CheckCircle } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';
const COURSES_URL = 'https://courses.treecampus.in';
const ANDROID_INTENT_URL = `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.academy.tree_campus;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;

const OpenApp = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isAndroid: false,
    isIOS: false,
    isDesktop: false,
  });
  const [status, setStatus] = useState('Opening Treecampus App...');

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isDesktop = !isAndroid && !isIOS;

    setDeviceInfo({ isAndroid, isIOS, isDesktop });

    if (isAndroid) {
      setStatus('Redirecting to Treecampus App...');
      // Execute Android Intent to launch app directly, with Play Store fallback
      const timer = setTimeout(() => {
        try {
          window.location.href = ANDROID_INTENT_URL;
        } catch (e) {
          console.warn('Auto redirect failed:', e);
        }
      }, 350);

      return () => clearTimeout(timer);
    } else if (isIOS) {
      setStatus('Welcome iOS Learner');
    } else {
      setStatus('Welcome Desktop Learner');
    }
  }, []);

  const handleOpenAppClick = () => {
    if (deviceInfo.isAndroid) {
      window.location.href = ANDROID_INTENT_URL;
    } else {
      window.location.href = PLAY_STORE_URL;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#081C15] flex items-center justify-center p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif] text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center relative overflow-hidden border border-white/20 animate-fade-in">
        
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo with pulse effect */}
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

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#1B4332] leading-tight mb-2 tracking-tight">
          Treecampus Learning
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {deviceInfo.isAndroid
            ? 'If the Treecampus app does not launch automatically in a moment, tap below to open or install it directly.'
            : 'Access 100% free Spoken English courses, Spokee 3D AI Teacher, and daily interactive Zoom classes.'}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Primary Action Button (Intent for Android) */}
          <a
            href={ANDROID_INTENT_URL}
            onClick={handleOpenAppClick}
            id="open-app-primary-btn"
            className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-white font-bold text-[15px] bg-gradient-to-r from-[#FF6B35] to-[#E85D04] hover:from-[#E85D04] hover:to-[#D9480F] shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Smartphone className="w-5 h-5" />
            <span>Open Treecampus App</span>
          </a>

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

        {/* Footer brand tagline */}
        <p className="mt-5 text-[11px] text-slate-400 font-medium">
          Treecampus • Democratizing Quality Education at No Cost
        </p>
      </div>
    </div>
  );
};

export default OpenApp;
