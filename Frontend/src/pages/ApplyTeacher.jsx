import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ApplyTeacher() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [resume, setResume] = useState(null);
  const [demoVideo, setDemoVideo] = useState(null);

  // Flow & Loaders
  const [step, setStep] = useState(1); // 1 = Details/Files, 2 = OTP, 3 = Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(300); // 5 minutes
  const [resendDisabled, setResendDisabled] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setPageLoaded(true);
  }, []);

  // Timer logic for OTP
  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setResendDisabled(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!resume) {
      newErrors.resume = 'Resume PDF is required';
    } else if (resume.type !== 'application/pdf') {
      newErrors.resume = 'Resume must be a PDF file';
    }

    if (!demoVideo) {
      newErrors.demoVideo = 'Demo video is required';
    } else if (!demoVideo.type.startsWith('video/')) {
      newErrors.demoVideo = 'Demo video must be a valid video file';
    } else if (demoVideo.size > 20 * 1024 * 1024) {
      newErrors.demoVideo = 'Video file size must be less than 20MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (name === 'resume') {
        setResume(files[0]);
      } else if (name === 'demoVideo') {
        setDemoVideo(files[0]);
      }
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    setIsSubmitting(true);

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('email', formData.email);
    submissionData.append('phone', formData.phone);
    submissionData.append('resume', resume);
    submissionData.append('demoVideo', demoVideo);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/teachers/apply`, {
        method: 'POST',
        body: submissionData
      });

      const result = await response.json();

      if (response.ok) {
        setApplicationId(result.applicationId);
        setStep(2); // Move to OTP verification step
        setTimer(300);
        setResendDisabled(true);
        toast.success('Files uploaded! OTP sent successfully via SMS.');
      } else {
        toast.error(result.message || 'Submission failed. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Connection failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP inputs auto-focus shift
  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus Next Box
    if (element.nextSibling && element.value !== '') {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    // Focus Previous Box on Backspace
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length < 6) {
      toast.error('Please enter the full 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/teachers/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, otp: otpCode })
      });

      const result = await response.json();

      if (response.ok) {
        setStep(3); // Success Step!
        toast.success(result.message);
      } else {
        toast.error(result.message || 'OTP verification failed.');
      }
    } catch (error) {
      console.error('OTP verify error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setResendDisabled(true);
    setTimer(300);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/teachers/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('OTP resent successfully.');
      } else {
        toast.error(result.message || 'Failed to resend OTP.');
        setResendDisabled(false);
      }
    } catch (error) {
      console.error('OTP resend error:', error);
      toast.error('Failed to resend OTP. Please try again.');
      setResendDisabled(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      <title>Become an Online Teacher – Tree Campus</title>
      <meta name="description" content="Apply online to teach at TreeCampus. Submit your demo video and resume, verify your phone, and join our elite educators team." />

      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
{/* Banner Section - Compact & beautifully fitted for PC and Mobile */}
<section className="relative py-12 md:py-16 overflow-hidden text-center border-b border-teal-100">
  {/* Background Image Container with Overlay for Text Readability */}
  <div className="absolute inset-0 z-0">
    {/* Background Image - Now fully visible with proper sizing */}
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat shadow-2xl"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
      }}
    />
    {/* Semi-transparent overlay to make text pop while keeping image visible */}
    {/* Using a gradient overlay for better text contrast without hiding the image */}
    {/* <div className="absolute inset-0 bg-gradient-to-r from-teal-900/70 via-teal-800/60 to-teal-900/70" /> */}
    {/* Optional: Add a slight dark overlay at the bottom for extra text clarity */}
    {/* <div className="absolute inset-0 bg-black/20" /> */}
  </div>

  {/* Content - Now properly visible with high contrast */}
  <div className="relative max-w-4xl mx-auto px-4 z-10">
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight drop-shadow-lg">
      Apply as an Online Teacher
    </h1>
    <div className="w-24 h-1.5 bg-teal-300 mx-auto rounded-full mb-6 shadow-md" />
    <p className="text-lg md:text-xl text-white max-w-2xl mx-auto font-semibold leading-relaxed drop-shadow-md">
      Join TreeCampus's elite educational panel and help thousands of students learn English online.
    </p>
    <button
      onClick={() => document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' })}
      className="mt-8 px-8 py-3.5 bg-[#14B8A6] hover:bg-[#0F766E] text-white text-base font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
    >
      Apply Now
    </button>
  </div>
</section>

        {/* Content Section */}
        <section id="apply-form" className="py-12 px-4 flex-1">
          <div className="max-w-3xl mx-auto">
            {step === 1 && (
              <div className={`bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-700 ${pageLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Your Professional Profile</h2>
                <p className="text-gray-500 mb-8 text-center text-sm">Please fill out the application details and upload your files to get verified.</p>

                <form onSubmit={handleApply} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none text-sm transition-all ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                    />
                    {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none text-sm transition-all ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                      />
                      {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-sm font-semibold text-gray-700">Phone Number *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-bold border-r pr-2 border-gray-200">+91</span>
                        <input
                          type="tel"
                          name="phone"
                          maxLength="10"
                          value={formData.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) handleChange({ target: { name: 'phone', value: val } });
                          }}
                          placeholder="10-digit mobile number"
                          className={`w-full pl-16 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#14B8A6] focus:border-[#14B8A6] outline-none text-sm transition-all ${errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Resume PDF */}
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">Resume File (PDF) *</label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors relative hover:bg-teal-50/20 ${errors.resume ? 'border-red-300 bg-red-50/10' : 'border-gray-200 bg-white'}`}>
                      <input
                        type="file"
                        name="resume"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-2xl block mb-2">📄</span>
                      <span className="block text-sm text-gray-600 font-semibold mb-1">
                        {resume ? resume.name : 'Upload your resume PDF'}
                      </span>
                      <span className="block text-xs text-gray-400">PDF files only (Maximum 5MB)</span>
                    </div>
                    {errors.resume && <p className="text-xs text-red-500 font-medium">{errors.resume}</p>}
                  </div>

                  {/* Demo Video Upload */}
                  <div className="space-y-1">
                    <label className="block text-sm font-semibold text-gray-700">1-Minute Demo Video *</label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors relative hover:bg-teal-50/20 ${errors.demoVideo ? 'border-red-300 bg-red-50/10' : 'border-gray-200 bg-white'}`}>
                      <input
                        type="file"
                        name="demoVideo"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-2xl block mb-2">🎥</span>
                      <span className="block text-sm text-gray-600 font-semibold mb-1">
                        {demoVideo ? demoVideo.name : 'Upload your 1-minute intro/teaching demo video'}
                      </span>
                      <span className="block text-xs text-gray-400">All standard video extensions allowed (Maximum 20MB)</span>
                    </div>
                    {errors.demoVideo && <p className="text-xs text-red-500 font-medium">{errors.demoVideo}</p>}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0F766E] text-white rounded-xl font-extrabold text-base shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        <span>Uploading Files & Generating OTP...</span>
                      </>
                    ) : (
                      <>Apply Now & Verify Phone</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: OTP Verification Modal/Screen */}
            {step === 2 && (
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-teal-50 text-[#14B8A6] rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📱</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
                <p className="text-gray-500 text-sm mb-6">
                  We have sent a 6-digit OTP code to the mobile number ending in <span className="font-bold text-gray-800">***{formData.phone.slice(-4)}</span>.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="flex justify-between gap-2">
                    {otp.map((data, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={data}
                        onChange={(e) => handleOtpChange(e.target, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-14 border-2 border-gray-200 rounded-xl text-center text-xl font-bold focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] outline-none transition-all"
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm px-1">
                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                      ⌛ Expire: <span className="text-[#0F766E] font-bold">{formatTime(timer)}</span>
                    </span>
                    <button
                      type="button"
                      disabled={resendDisabled}
                      onClick={handleResendOtp}
                      className={`font-bold transition-all ${resendDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-[#14B8A6] hover:text-[#0F766E]'}`}
                    >
                      Resend OTP
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 bg-gradient-to-r from-[#14B8A6] to-[#0F766E] text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      'Verify & Submit Application'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Step 3: Success Screen */}
            {step === 3 && (
              <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 animate-bounce">🎉</div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Application Submitted!</h2>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Thank you, <span className="font-bold text-gray-900">{formData.name}</span>. Your phone number was verified successfully, and your teacher profile has been submitted for administrative review. We have also sent a confirmation email to <span className="font-bold text-gray-900">{formData.email}</span>.
                </p>

                <div className="p-4 bg-teal-50/50 rounded-xl mb-8 border border-teal-100 text-sm text-[#0F766E] font-medium max-w-sm mx-auto">
                  ℹ️ Our team will review your resume and demo video, and update you within 3-5 working days.
                </div>

                <div className="flex gap-4 max-w-sm mx-auto">
                  <button
                    onClick={() => navigate('/courses')}
                    className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Courses
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 bg-[#14B8A6] hover:bg-[#0F766E] text-white rounded-xl font-bold transition-colors"
                  >
                    Apply Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
