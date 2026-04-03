// client/src/components/auth/Login.jsx
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const translations = {
  english: {
    title: 'TreeCampus Login',
    subtitle: 'Access your learning dashboard and explore courses',
    admin: 'Admin',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot Password?',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    noAccount: "Don't have an account?",
    registerNow: 'Register Now',
    fillAllFields: 'Please fill in all fields',
    loginFailed: 'Login failed. Please try again.',
    incorrectPassword: 'Incorrect password. Please try again.',
    userNotFound: 'User not found. Please check your email.',
    welcomeTitle: 'Welcome to TreeCampus',
    welcomeSubtitle: 'Start your journey to accessing unlimited courses and learning resources',
    feature1: '1000+ Courses Available',
    feature2: 'Learn from Expert Instructors',
    feature3: 'Earn Certificates',
    feature4: '24/7 Access',
    rightPanelTitle: 'Welcome to TreeCampus',
    rightPanelSubtitle: 'Continue your learning journey and access unlimited courses',
    continueWithGoogle: 'Continue with Google',
    or: 'OR',
    loginModeEmail: 'Login with Email',
    loginModePhone: 'Login with Phone (OTP)',
    phoneLabel: 'Phone Number',
    phonePlaceholder: 'Enter 10-digit phone number',
    otpLabel: 'OTP',
    otpPlaceholder: 'Enter 6-digit OTP',
    sendOTP: 'Send OTP',
    sendingOTP: 'Sending...',
    otpSentSuccess: 'OTP sent to your phone via SMS',
    resendOTP: 'Resend OTP',
    resendIn: 'Resend OTP in',
    passwordExpiredTitle: 'Password Expired',
    passwordExpiredMsg: 'Your password has expired for security reasons. What would you like to do?',
    switchToPhone: 'Login with Phone OTP',
    changePassword: 'Change Password',
    claimAccountTitle: 'Link Your Account',
    claimAccountMsg: 'This phone number is not registered. If you already have an account, enter your email to link this phone.',
    claimEmailPlaceholder: 'Enter your account email',
    verifyAndLink: 'Verify & Link Phone',
    showPassword: 'Show',
    hidePassword: 'Hide',
  },
  hindi: {
    title: 'LMS लॉगिन',
    subtitle: 'अपने लर्निंग डैशबोर्ड तक पहुंचें और कोर्स एक्सप्लोर करें',
    admin: 'व्यवस्थापक',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    forgotPassword: 'पासवर्ड भूल गए?',
    loginButton: 'लॉगिन करें',
    loggingIn: 'लॉगिन हो रहा है...',
    noAccount: 'कोई अकाउंट नहीं है?',
    registerNow: 'अभी रजिस्टर करें',
    fillAllFields: 'कृपया सभी फ़ील्ड भरें',
    loginFailed: 'लॉगिन विफल रहा। कृपया पुनः प्रयास करें।',
    incorrectPassword: 'गलत पासवर्ड। कृपया पुनः प्रयास करें।',
    userNotFound: 'उपयोगकर्ता नहीं मिला। कृपया अपना ईमेल जांचें।',
    welcomeTitle: 'LMS में आपका स्वागत है',
    welcomeSubtitle: 'असीमित कोर्स और लर्निंग संसाधनों तक पहुंचने की अपनी यात्रा शुरू करें',
    feature1: '1000+ कोर्स उपलब्ध',
    feature2: 'विशेषज्ञ प्रशिक्षकों से सीखें',
    feature3: 'प्रमाणपत्र अर्जित करें',
    feature4: '24/7 तक पहुंच',
    rightPanelTitle: 'LMS में आपका स्वागत है',
    rightPanelSubtitle: 'अपने सीखने की यात्रा को जारी रखें और असीमित कोर्स तक पहुंचें',
    continueWithGoogle: 'गूगल के साथ जारी रखें',
    or: 'या',
    loginModeEmail: 'ईमेल से लॉगिन करें',
    loginModePhone: 'फोन (OTP) से लॉगिन करें',
    phoneLabel: 'फ़ोन नंबर',
    phonePlaceholder: '10 अंकों का फ़ोन नंबर दर्ज करें',
    otpLabel: 'ओटीपी',
    otpPlaceholder: '6 अंकों का ओटीपी दर्ज करें',
    sendOTP: 'ओटीपी भेजें',
    sendingOTP: 'भेजा जा रहा है...',
    otpSentSuccess: 'आपके फोन पर SMS के जरिए OTP भेज दिया गया है',
    resendOTP: 'ओटीपी पुनः भेजें',
    resendIn: 'ओटीपी पुनः भेजें ',
    passwordExpiredTitle: 'पासवर्ड समाप्त हो गया',
    passwordExpiredMsg: 'सुरक्षा कारणों से आपका पासवर्ड समाप्त हो गया है। आप क्या करना चाहेंगे?',
    switchToPhone: 'फोन ओटीपी से लॉगिन करें',
    changePassword: 'पासवर्ड बदलें',
    claimAccountTitle: 'अपना खाता लिंक करें',
    claimAccountMsg: 'यह फोन नंबर पंजीकृत नहीं है। यदि आपके पास पहले से ही एक खाता है, तो इस फोन को लिंक करने के लिए अपना ईमेल दर्ज करें।',
    claimEmailPlaceholder: 'अपना खाता ईमेल दर्ज करें',
    verifyAndLink: 'सत्यापित करें और फोन लिंक करें',
    showPassword: 'दिखाएं',
    hidePassword: 'छुपाएं',
  }
};


const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'phone'
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showFullScreenWelcome, setShowFullScreenWelcome] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('lms-language');
    return savedLanguage || 'english';
  });
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryIsPlaceholder, setExpiryIsPlaceholder] = useState(false); // ✅ New state
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone Claim Modal States (Flow 1: multiple accounts share same phone)
  const [showPhoneClaimModal, setShowPhoneClaimModal] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimEmailOtp, setClaimEmailOtp] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimOtpSent, setClaimOtpSent] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');

  // Add Phone Modal States (Flow 2: user logged in with email but has no phone)
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);
  const [setupPhone, setSetupPhone] = useState('');
  const [setupOtp, setSetupOtp] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupOtpSent, setSetupOtpSent] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');
  const [pendingLoginTokens, setPendingLoginTokens] = useState(null);

  const { login, refreshUser, requestLoginOTP, loginWithOTP, claimPhone: claimPhoneCtx, setupNewPhone } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const successMessage = location.state?.message;
  const prefillEmail = location.state?.email;

  const t = translations[currentLanguage];

  // Timer logic for Resend OTP
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const languages = [
    { code: 'english', name: 'English', flag: '🇬🇧' },
    { code: 'hindi', name: 'हिंदी', flag: '🇮🇳' }
  ];

  const changeLanguage = (languageCode) => {
    setCurrentLanguage(languageCode);
    localStorage.setItem('lms-language', languageCode);
    setShowLanguageDropdown(false);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.language-selector')) {
      setShowLanguageDropdown(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullScreenWelcome(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // ⭐ HANDLE GOOGLE OAUTH REDIRECT FIRST
    const queryParams = new URLSearchParams(location.search);
    const oauthToken = queryParams.get('token');
    const oauthRefreshToken = queryParams.get('refreshToken');
    const oauthUserData = queryParams.get('user');

    if (oauthToken && oauthUserData) {
      try {
        const user = JSON.parse(oauthUserData);
        const needsProfileCompletion = queryParams.get('needsProfileCompletion') === 'true';
        
        // Save to localStorage
        localStorage.setItem('token', oauthToken);
        if (oauthRefreshToken) localStorage.setItem('refreshToken', oauthRefreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('authTimestamp', Date.now().toString());

        // Check if Google user needs to complete profile (add phone/password)
        if (needsProfileCompletion) {
          console.log('🔵 Google user needs to complete profile');
          // Navigate to profile completion page
          navigate('/complete-profile', { state: { user }, replace: true });
          return;
        }

        // ⭐ REDIRECT TO VERIFICATION IF NOT VERIFIED
        if (user.isVerified === false) {
          console.log('🟠 Google user not verified. Redirecting to verification page...');
          navigate('/verify-otp', { 
            replace: true, 
            state: { 
              email: user.email, 
              phone: user.phone, 
              mode: 'register',
              triggerAutoResend: true
            } 
          });
          return;
        }

        // Update context (this will trigger re-render and navigate)
        window.location.href = user.role === 'admin' ? '/admin' : '/dashboard';
        return;
      } catch (e) {
        console.error('Failed to parse Google user data', e);
        setError('Google authentication failed. Please try again.');
      }
    }

    // ⭐ REDIRECT IF ALREADY LOGGED IN (AND NOT DOING OAUTH)
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    // Only redirect if we have stored data AND we aren't currently in the middle of a login process
    if (storedToken && storedUser && !loading) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        // ⭐ If logged in but not verified, go to verification
        if (parsedUser.isVerified === false) {
           navigate('/verify-otp', { 
             replace: true, 
             state: { 
               email: parsedUser.email, 
               phone: parsedUser.phone, 
               mode: 'register' 
             } 
           });
           return;
        }

        navigate(parsedUser.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
        return;
      } catch (e) {
        console.error('Failed to parse user from localStorage');
      }
    }

    if (prefillEmail) {
      setFormData(prev => ({ ...prev, email: prefillEmail }));
    }
  }, [prefillEmail, location.search, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setOtpMessage('');
  };

  const handleSendOTP = async () => {
    if (!formData.phone || formData.phone.length !== 10) {
      setError(t.phonePlaceholder);
      return;
    }

    setOtpLoading(true);
    setError('');
    setOtpMessage('');

    try {
      const response = await requestLoginOTP(formData.phone);
      const data = response.data || response; // Handle both direct and response objects

      if (data.success) {
        setOtpSent(true);
        setOtpMessage(t.otpSentSuccess);
        setTimer(60);
      } else {
        // Handle failure if not caught as an exception
        const errorCode = data.errorCode || data.data?.errorCode;
        if (errorCode === 'PHONE_CLAIM_REQUIRED' || (data.message && data.message.toLowerCase().includes('multiple accounts'))) {
          setShowPhoneClaimModal(true);
        } else {
          setError(data.message || 'Failed to send OTP');
        }
      }
    } catch (err) {
      console.error('❌ Send OTP error:', err);
      const errorData = err.response?.data;
      const errorCode = errorData?.errorCode || err.errorCode;
      const errorMessage = errorData?.message || err.message || '';

      if (errorCode === 'PHONE_CLAIM_REQUIRED' || errorMessage.toLowerCase().includes('multiple accounts')) {
        setShowPhoneClaimModal(true);
        setError('');
      } else {
        setError(errorMessage || 'Network error. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // Flow 1: Send Email OTP for phone claim
  const handleSendClaimOTP = async () => {
    if (!claimEmail) {
      setClaimMessage('Please enter your email');
      return;
    }
    setClaimLoading(true);
    setClaimMessage('');
    try {
      const data = await authService.sendClaimOTP(formData.phone, claimEmail);
      if (data.success) {
        setClaimOtpSent(true);
        setClaimMessage('OTP sent to your email!');
        setTimer(60); // ✅ Start 60s timer
      } else {
        setClaimMessage(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setClaimMessage(err.message || 'No account found with this email and phone combination.');
    } finally {
      setClaimLoading(false);
    }
  };

  // Flow 1: Verify email OTP + claim phone
  const handleClaimPhone = async () => {
    if (!claimEmailOtp || !claimPassword) {
      setClaimMessage('Please fill in all fields');
      return;
    }
    if (claimPassword.length < 6) {
      setClaimMessage('Password must be at least 6 characters');
      return;
    }
    setClaimLoading(true);
    setClaimMessage('');
    try {
      const result = await claimPhoneCtx(formData.phone, claimEmail, claimEmailOtp, claimPassword);
      if (result.success) {
        setShowPhoneClaimModal(false);
        const userRole = result.user?.role || 'student';
        navigate(userRole === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        setClaimMessage(result.message || 'Verification failed');
      }
    } catch (err) {
      setClaimMessage(err.message || 'Verification failed');
    } finally {
      setClaimLoading(false);
    }
  };

  // Flow 2: Send SMS OTP for phone setup
  const handleSendSetupOTP = async () => {
    if (!setupPhone || !/^\d{10}$/.test(setupPhone)) {
      setSetupMessage('Please enter a valid 10-digit phone number');
      return;
    }
    
    // Prevent common placeholders
    if (setupPhone === '0000000000' || setupPhone === '1234567890') {
      setSetupMessage('Please enter your actual active phone number');
      return;
    }

    setSetupLoading(true);
    setSetupMessage('');
    try {
      const data = await authService.requestPhoneSetupOTP(setupPhone);
      if (data.success) {
        setSetupOtpSent(true);
        setSetupMessage('OTP sent to your phone via SMS!');
        setTimer(60); // ✅ Start 60s timer
      } else {
        setSetupMessage(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setSetupMessage(err.message || 'Failed to send OTP');
    } finally {
      setSetupLoading(false);
    }
  };

  // Flow 2: Verify SMS OTP + setup phone
  const handleSetupPhone = async () => {
    if (!setupOtp || !setupPassword) {
      setSetupMessage('Please fill in all fields');
      return;
    }
    if (setupPassword.length < 6) {
      setSetupMessage('Password must be at least 6 characters');
      return;
    }
    setSetupLoading(true);
    setSetupMessage('');
    try {
      const result = await setupNewPhone(setupPhone, setupOtp, setupPassword);
      if (result.success) {
        setShowAddPhoneModal(false);
        // Success! Dashboard will be handled by AuthContext setUser() which we called in setupNewPhone
        // but we navigate just in case or if immediate re-render didn't happen
        const userRole = result.data?.user?.role || 'student';
        navigate(userRole === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        setSetupMessage(result.message || 'Setup failed');
      }
    } catch (err) {
      setSetupMessage(err.message || 'Setup failed');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;
    
    setError('');

    if (loginMode === 'email') {
      if (!formData.email || !formData.password) {
        setError(t.fillAllFields);
        return;
      }
    } else {
      if (!formData.phone || !formData.otp) {
        setError(t.fillAllFields);
        return;
      }
    }

    setLoading(true);

    try {
      let result;
      if (loginMode === 'email') {
        result = await login(formData.email, formData.password);
      } else {
        result = await loginWithOTP(formData.phone, formData.otp);
      }
      
      console.log('✅ Login result:', result);
      
      if (result && result.success) {
        // Get user role from the login result
        const userRole = result.user?.role || 'student';
        
        console.log('👤 User Role Info:', {
          role: userRole,
          resultData: result.user
        });
        
        // Check if user needs to add phone (Flow 2)
        if (result.needsPhoneSetup) {
          console.log('📱 User needs to add phone number');
          setShowAddPhoneModal(true);
          setLoading(false);
          return;
        }

        // Route based on role
        const redirectPath = userRole === 'admin' ? '/admin' : '/dashboard';
        
        console.log('➡️ Navigating to:', redirectPath, 'Role:', userRole);
        navigate(redirectPath, { replace: true });
        
      } else {
        // Show error message without reloading page
        const errorMessage = result?.message || t.loginFailed;
        const errorMsgLower = errorMessage.toLowerCase();

        // ✅ CHECK FOR PASSWORD EXPIRED ERROR FIRST
        if (result?.errorCode === 'PASSWORD_EXPIRED') {
          setExpiryIsPlaceholder(result.isPlaceholderPhone || false);
          setShowExpiryModal(true);
          setLoading(false);
          return;
        }

        // ⭐ PRIORITIZE VERIFICATION REDIRECT
        if (errorMsgLower.includes('verify your email') || errorMsgLower.includes('verify your phone')) {
          console.log('User not verified. Redirecting to verification page...', result.phone);
          // Pass the email and phone to the verification page so user doesn't have to re-type it
          navigate('/verify-otp', { 
            replace: true, 
            state: { 
              email: formData.email, 
              phone: result.phone || formData.phone, 
              mode: 'register', 
              triggerAutoResend: true 
            } 
          });
          return;
        }

        setError(errorMessage);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      
      let errorMessage = t.loginFailed;
      
      // Determine the error message string from various possible locations
      const responseMsg = err.response?.data?.message || err.message || '';
      
      // Handle different error types
      if (err.response?.status === 401) {
        errorMessage = t.incorrectPassword;
      } else if (responseMsg) {
        const errorMsgLower = responseMsg.toLowerCase();
         if (errorMsgLower.includes('password') || errorMsgLower.includes('incorrect') || errorMsgLower.includes('invalid') || errorMsgLower.includes('wrong') || errorMsgLower.includes('credentials')) {
          errorMessage = t.incorrectPassword;
        } else if (errorMsgLower.includes('user') || errorMsgLower.includes('not found') || errorMsgLower.includes('exist') || errorMsgLower.includes('email')) {
          errorMessage = t.userNotFound;
        } else if (errorMsgLower.includes('network') || errorMsgLower.includes('fetch') || errorMsgLower.includes('connection')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = responseMsg || t.loginFailed;
        }

        // ✅ CHECK FOR PASSWORD EXPIRED ERROR
        if (err.response?.data?.errorCode === 'PASSWORD_EXPIRED') {
          setExpiryIsPlaceholder(err.response.data.isPlaceholderPhone || false);
          setShowExpiryModal(true);
          setLoading(false);
          return;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  return (
    <>


      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-50 flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 z-40">
          <div className="relative language-selector">
            <button 
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg hover:bg-white transition-all"
            >
              <span className="font-medium">
                {languages.find(lang => lang.code === currentLanguage)?.flag}
              </span>
              <span className="text-gray-700 hidden sm:inline">
                {languages.find(lang => lang.code === currentLanguage)?.name}
              </span>
              <svg 
                className={`w-4 h-4 text-gray-500 transform transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className={`absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border min-w-48 transform transition-all duration-200 origin-top-right ${
              showLanguageDropdown ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'
            }`}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-teal-50 text-teal-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    currentLanguage === lang.code ? "bg-teal-100 text-teal-700" : "text-gray-700"
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <svg className="w-4 h-4 ml-auto text-[#14B8A6]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl bg-white">
          
          {/* Left Panel - Login Form */}
          <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center order-2 md:order-1">
            <div className="text-left mb-6">
              <div className="flex justify-start mb-3">
                <svg className="w-12 h-12 text-[#14B8A6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#14B8A6]">
                {t.title}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t.subtitle}
              </p>
            </div>

            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            {otpMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium">{otpMessage}</p>
              </div>
            )}

            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button 
                onClick={() => { setLoginMode('email'); setError(''); setOtpMessage(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${loginMode === 'email' ? 'bg-white shadow-sm text-[#14B8A6]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.loginModeEmail}
              </button>
              <button 
                onClick={() => { setLoginMode('phone'); setError(''); setOtpMessage(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${loginMode === 'phone' ? 'bg-white shadow-sm text-[#14B8A6]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.loginModePhone}
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => window.location.href = `${import.meta.env.VITE_API_ORIGIN}/api/auth/google`}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition transform hover:-translate-y-0.5"
                type="button"
              >
                <img className="h-5 w-5 mr-2" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                {t.continueWithGoogle}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t.or}</span>
                </div>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>


              {loginMode === 'email' ? (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.emailLabel}
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition"
                      placeholder={t.emailPlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.passwordLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="appearance-none w-full px-4 py-3 pr-16 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition"
                        placeholder={t.passwordPlaceholder}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-sm font-medium hover:opacity-80 transition"
                        style={{ color: '#14B8A6' }}
                      >
                        {showPassword ? t.hidePassword : t.showPassword}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <Link to="/forgot-password" className="font-medium text-[#14B8A6] hover:text-black transition">
                        {t.forgotPassword}
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                 <>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      {t.phoneLabel}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="appearance-none min-w-0 flex-1 px-3 md:px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition"
                        placeholder={t.phonePlaceholder}
                      />
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={otpLoading || formData.phone.length !== 10}
                        className="px-3 sm:px-4 py-2 text-sm max-w-fit flex-shrink-0 bg-teal-100 text-[#14B8A6] font-medium rounded-lg hover:bg-teal-200 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {otpLoading ? t.sendingOTP : t.sendOTP}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                          {t.otpLabel}
                        </label>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          required
                          maxLength="6"
                          value={formData.otp}
                          onChange={handleChange}
                          className="appearance-none w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent transition text-center tracking-widest font-bold text-xl"
                          placeholder={t.otpPlaceholder}
                          autoComplete="one-time-code"
                        />
                      </div>
                      
                      <div className="flex justify-end pr-1">
                        {timer > 0 ? (
                          <span className="text-sm text-gray-500 font-medium">
                            {t.resendIn} {timer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={otpLoading}
                            className="text-sm font-bold text-[#14B8A6] hover:text-black transition-colors flex items-center gap-1"
                          >
                            {otpLoading ? (
                              <div className="w-3 h-3 border-2 border-[#14B8A6] border-t-transparent rounded-full animate-spin"></div>
                            ) : null}
                            {t.resendOTP}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#115E59] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14B8A6] transition disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t.loggingIn}
                  </>
                ) : (
                  t.loginButton
                )}
              </button>

              <p className="text-center text-sm text-gray-600 mt-6">
                {t.noAccount}{' '}
                <Link to="/register" className="font-medium text-[#14B8A6] hover:text-black transition">
                  {t.registerNow}
                </Link>
              </p>

              
            </form>
          </div>

          {/* Right Panel - Welcome Section - ✅ Fixed order for mobile */}
          <div className="bg-[#115E59] p-8 lg:p-12 text-white hidden md:flex flex-col justify-center order-1 md:order-2">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                {t.rightPanelTitle}
              </h2>
              <p className="text-teal-100 mb-8 text-lg">
                {t.rightPanelSubtitle}
              </p>
              <ul className="space-y-4 text-left max-w-md mx-auto">
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>{t.feature1}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>{t.feature2}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>{t.feature3}</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  <span>{t.feature4}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slide-up {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
          
          .animate-slide-up {
            animation: slide-up 0.8s ease-out;
          }
          
          .animate-slide-up-delay {
            animation: slide-up 0.8s ease-out 0.2s both;
          }
          
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
        `}</style>

        {/* ========== Phone Claim Modal (Flow 1) ========== */}
        {showPhoneClaimModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full sm:p-7 p-5 transform animate-slide-up relative">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowPhoneClaimModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Verify Your Account</h3>
                  <p className="text-xs text-gray-500">This phone is linked to multiple accounts</p>
                </div>
              </div>

              {claimMessage && (
                <div className={`text-xs font-medium p-2.5 rounded-lg mb-3 border ${
                  claimMessage.includes('sent') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {claimMessage}
                </div>
              )}
              
              <div className="space-y-3">
                {/* Email + Send OTP inline */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Your Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={claimEmail}
                      onChange={(e) => setClaimEmail(e.target.value)}
                      placeholder="e.g. user@email.com"
                      disabled={claimOtpSent}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none transition disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendClaimOTP}
                      disabled={claimLoading || !claimEmail || (claimOtpSent && timer > 0)}
                      className="px-3 py-2 text-xs font-bold bg-[#115E59] text-white rounded-lg hover:bg-black transition disabled:opacity-40 whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                    >
                      {claimLoading ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (claimOtpSent && timer > 0) ? `Resend in ${timer}s` : claimOtpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* OTP + Password appear after OTP is sent */}
                {claimOtpSent && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Email OTP</label>
                      <input
                        type="text"
                        value={claimEmailOtp}
                        onChange={(e) => setClaimEmailOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        autoFocus
                        autoComplete="one-time-code"
                        className="w-full text-center text-xl tracking-[0.3em] px-3 py-2.5 border-2 border-teal-200 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none transition font-mono"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={claimPassword}
                        onChange={(e) => setClaimPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none pr-9 transition"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-[30px] text-gray-400 hover:text-[#14B8A6]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {showPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.563 3.029" />
                          ) : (
                            <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          )}
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleClaimPhone}
                      disabled={claimLoading || !claimEmailOtp || !claimPassword}
                      className="w-full py-3 bg-[#14B8A6] text-white font-bold rounded-xl hover:bg-black shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {claimLoading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                      {claimLoading ? 'Verifying...' : 'Verify & Login'}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-gray-400">This will link this phone to your account only.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhoneClaimModal(false);
                      setClaimEmail(''); setClaimEmailOtp(''); setClaimPassword('');
                      setClaimOtpSent(false); setClaimMessage('');
                    }}
                    className="text-xs text-gray-500 font-medium hover:text-gray-900 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ========== Add Phone Modal (Flow 2) ========== */}
        {showAddPhoneModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full sm:p-7 p-5 transform animate-slide-up relative">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowAddPhoneModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Link Phone Number</h3>
                  <p className="text-xs text-gray-500">Your account needs a phone number</p>
                </div>
              </div>

              {setupMessage && (
                <div className={`text-xs font-medium p-2.5 rounded-lg mb-3 border ${
                  setupMessage.includes('sent') || setupMessage.includes('success') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {setupMessage}
                </div>
              )}
              
              <div className="space-y-3">
                {/* Phone + Send OTP inline */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Phone Number</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={setupPhone}
                      onChange={(e) => setSetupPhone(e.target.value)}
                      placeholder="Enter 10 digits"
                      disabled={setupOtpSent}
                      maxLength={10}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none transition disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendSetupOTP}
                      disabled={setupLoading || setupPhone.length !== 10 || (setupOtpSent && timer > 0)}
                      className="px-3 py-2 text-xs font-bold bg-[#115E59] text-white rounded-lg hover:bg-black transition disabled:opacity-40 whitespace-nowrap flex items-center gap-1 flex-shrink-0"
                    >
                      {setupLoading ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (setupOtpSent && timer > 0) ? `Resend in ${timer}s` : setupOtpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* OTP + Password appear after SMS is sent */}
                {setupOtpSent && (
                  <div className="space-y-3 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">SMS OTP</label>
                      <input
                        type="text"
                        value={setupOtp}
                        onChange={(e) => setSetupOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        autoFocus
                        autoComplete="one-time-code"
                        className="w-full text-center text-xl tracking-[0.3em] px-3 py-2.5 border-2 border-teal-200 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none transition font-mono"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Set New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14B8A6] outline-none pr-9 transition"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-[30px] text-gray-400 hover:text-[#14B8A6]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {showPassword ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.563 3.029" />
                          ) : (
                            <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                          )}
                        </svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSetupPhone}
                      disabled={setupLoading || !setupOtp || !setupPassword}
                      className="w-full py-3 bg-[#14B8A6] text-white font-bold rounded-xl hover:bg-black shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {setupLoading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
                      {setupLoading ? 'Saving Account...' : 'Finish Setup'}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-gray-400">Security: Requires one-time phone verification.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPhoneModal(false);
                      setSetupPhone(''); setSetupOtp(''); setSetupPassword('');
                      setSetupOtpSent(false); setSetupMessage('');
                    }}
                    className="text-xs text-gray-500 font-medium hover:text-gray-900 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Password Expired Modal */}
        {showExpiryModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform animate-slide-up relative">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowExpiryModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 11-8 0 4 4 0 018 0zM7 10v4a5 5 0 0010 0v-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t.passwordExpiredTitle}</h3>
                <p className="text-gray-600 mb-8">{t.passwordExpiredMsg}</p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowExpiryModal(false);
                      navigate('/forgot-password', { state: { email: formData.email } });
                    }}
                    className="w-full py-3 bg-[#115E59] text-white font-bold rounded-xl hover:bg-black transition transform hover:-translate-y-1 cursor-pointer"
                  >
                    {t.changePassword}
                  </button>
                  {!expiryIsPlaceholder && (
                    <button
                      onClick={() => {
                        setShowExpiryModal(false);
                        setLoginMode('phone');
                      }}
                      className="w-full py-3 bg-white border-2 border-[#14B8A6] text-[#14B8A6] font-bold rounded-xl hover:bg-teal-50 transition cursor-pointer"
                    >
                      {t.switchToPhone}
                    </button>
                  )}
                  <button
                    onClick={() => setShowExpiryModal(false)}
                    className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};

export default Login;