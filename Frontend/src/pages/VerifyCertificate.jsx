import { useState } from 'react';
import { FiCheckCircle, FiSearch, FiAward, FiDownload, FiUser, FiBook, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import api from '../services/api';

const getCertificateTemplate = (cert) => {
    const order = cert.courseId?.seriesOrder;
    const title = (cert.courseId?.title || cert.courseTitle || '').toLowerCase();
    
    if (order === 1 || title.includes('part-1') || title.includes('1 to 30')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654748/Certificate-1_xnrs9y.png';
    } else if (order === 2 || title.includes('part-2') || title.includes('31 to 60')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654744/Certificate2_wsx0hl.png';
    } else if (order === 3 || title.includes('part-3') || title.includes('61 to 90')) {
        return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654744/Certificate3_2_ubo89f.png';
    }
    
    return 'https://res.cloudinary.com/dbbll23jz/image/upload/v1780654748/Certificate-1_xnrs9y.png';
};

const VerifyCertificate = () => {
    const [certificateId, setCertificateId] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [certificate, setCertificate] = useState(null);
    const [error, setError] = useState(null);

    const handleVerify = async (e) => {
        e.preventDefault();
        
        if (!certificateId.trim()) {
            toast.error('Please enter a Certificate ID');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setCertificate(null);
            
            const response = await api.get(`/certificates/verify/${certificateId.trim()}`);
            
            if (response.data.success) {
                setCertificate(response.data.data);
                toast.success('Certificate Verified Successfully!');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError(err.response?.data?.message || 'Invalid Certificate ID or not found.');
            toast.error('Certificate verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCertificate = async () => {
        if (!certificate) return;
        
        try {
            setDownloading(true);

            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [842, 595]
            });

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = getCertificateTemplate(certificate);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const width = doc.internal.pageSize.getWidth();
            const height = doc.internal.pageSize.getHeight();

            doc.addImage(img, 'JPEG', 0, 0, width, height);

            const nameY = height * 0.565; 
            const nameX = width * 0.5; 
            
            const name = certificate.userName || certificate.userId?.name || '';
            doc.setFontSize(36); 
            doc.setFont('times', 'bolditalic'); 
            doc.setTextColor(26, 37, 47);
            doc.text(name, nameX, nameY, { align: 'center', baseline: 'bottom' });

            const dateY = height * 0.81; 
            const dateX = width * 0.5; 

            const date = new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.setFontSize(14); 
            doc.setFont('times', 'bold');
            doc.setTextColor(26, 37, 47);
            doc.text(date, dateX, dateY, { align: 'center', baseline: 'bottom' });

            // ID
            doc.setFontSize(16); 
            doc.setTextColor(0, 0, 0); 
            doc.text(`Certificate ID: ${certificate.certificateNumber}`, width - 40, height - 25, { align: 'right' });

            const fileName = `Certificate-${name.replace(/\s+/g, '_')}-${certificate.certificateNumber}.pdf`;
            doc.save(fileName);

            toast.success('Certificate downloaded successfully!');
        } catch (error) {
            console.error('Error downloading certificate:', error);
            toast.error('Failed to download certificate. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8">
            
            <div className="w-full max-w-3xl mb-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                    <FiAward className="w-8 h-8 text-teal-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Verify Certificate</h1>
                <p className="text-lg text-gray-600">
                    Enter the Certificate ID to verify its authenticity and view the details.
                </p>
            </div>

            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
                <div className="p-8 md:p-10">
                    <form onSubmit={handleVerify} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <FiSearch className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={certificateId}
                                onChange={(e) => setCertificateId(e.target.value)}
                                placeholder="Enter Certificate ID (e.g. CERT-178055xxxxx-xxxx)"
                                className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-[#115E59] hover:bg-[#0F766E] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Verifying...</span>
                                </div>
                            ) : (
                                <span>Verify Now</span>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-xl">❌</span>
                            </div>
                            <div>
                                <h3 className="font-bold">Verification Failed</h3>
                                <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {certificate && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-8 md:p-10 animate-fadeInUp">
                        <div className="flex items-center gap-3 mb-6">
                            <FiCheckCircle className="w-8 h-8 text-emerald-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Valid Certificate</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-blue-600 mt-1">
                                    <FiUser className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Student Name</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {certificate.userName || certificate.userId?.name}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-purple-50 rounded-lg text-purple-600 mt-1">
                                    <FiBook className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Course / Exam</p>
                                    <p className="text-lg font-bold text-gray-900 line-clamp-2">
                                        {certificate.courseTitle || certificate.courseId?.title}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 mt-1">
                                    <FiCalendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Issue Date</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-amber-50 rounded-lg text-amber-600 mt-1">
                                    <FiAward className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Certificate ID</p>
                                    <p className="text-lg font-bold text-gray-900 font-mono text-sm break-all">
                                        {certificate.certificateNumber}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDownloadCertificate}
                            disabled={downloading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {downloading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Downloading PDF...
                                </>
                            ) : (
                                <>
                                    <FiDownload className="w-5 h-5" />
                                    Download Original Certificate
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyCertificate;
