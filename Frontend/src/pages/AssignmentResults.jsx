import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { FiDownload } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const AssignmentResults = () => {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const { score, passed, totalScore, totalPoints, certificateId } = location.state || {};

  useEffect(() => {
    if (passed && certificateId) {
      fetchCertificate();
    }
  }, [certificateId, passed]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/certificates/${certificateId}`);
      setCertificate(res.data.data);
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Result Card */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          {/* Result Header */}
          <div className="text-center mb-6">
            {passed ? (
              <>
                <div className="text-4xl mb-2">🎉</div>
                <h1 className="text-2xl font-bold text-green-600 mb-1">Congratulations!</h1>
                <p className="text-base text-gray-600">You have successfully completed the assignment</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">😔</div>
                <h1 className="text-2xl font-bold text-red-600 mb-1">Sorry!</h1>
                <p className="text-base text-gray-600">You did not pass. Please review the material.</p>
              </>
            )}
          </div>

          {/* Score Display */}
          <div className="bg-gradient-to-r from-[#14B8A6] to-teal-600 rounded-lg p-6 text-white text-center mb-6">
            <p className="text-sm mb-1 opacity-90">Your Score</p>
            <p className="text-4xl font-bold mb-1">{score}%</p>
            <p className="text-sm opacity-90">
              {totalScore !== undefined && totalPoints !== undefined
                ? `${totalScore} out of ${totalPoints} points`
                : ''}
            </p>
          </div>

          {/* Result Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Result</p>
                <p className={`text-xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {passed ? '✓ PASSED' : '✗ FAILED'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Status</p>
                <p className="text-xl font-bold text-gray-800">
                  {passed ? 'Certified' : 'Incomplete'}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Section */}
          {passed && certificate && (
            <div className="border border-[#14B8A6]/20 rounded-lg p-4 mb-6 bg-teal-50">
              <h3 className="text-lg font-bold text-[#14B8A6] mb-2 flex items-center gap-2">🎓 Certificate Earned</h3>
              <p className="text-gray-600 text-sm mb-4">
                <strong>{certificate?.userName || user?.name || 'User'}</strong>, your certificate of completion is ready.
              </p>
              <button
                onClick={() => navigate('/certificate')}
                className="w-full bg-[#115E59] text-white py-3 px-4 rounded-lg font-bold hover:bg-[#0F766E] transition-colors flex items-center justify-center gap-2"
              >
                <FiDownload className="w-5 h-5" />
                View & Download Certificate
              </button>
            </div>
          )}

          {!passed && (
            <div className="border border-blue-200 rounded-lg p-4 mb-6 bg-blue-50">
              <h3 className="text-lg font-bold text-blue-600 mb-2">💡 Next Steps</h3>
              <ul className="text-gray-600 text-sm space-y-1">
                <li>✓ Review the course materials</li>
                <li>✓ Focus on challenging topics</li>
                <li>✓ Review course and re-attempt</li>
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/courses/${courseId}`)}
              className="flex-1 bg-[#115E59] text-white py-2.5 rounded-lg font-bold hover:bg-[#0F766E] transition text-sm shadow"
            >
              Back to Course
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>

       
      </div>
    </div>
  );
};

export default AssignmentResults;