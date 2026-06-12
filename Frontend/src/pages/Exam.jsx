import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiAward, FiBook, FiChevronRight, FiTrendingUp, FiBarChart2, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Exam() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments`);
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.data);
      } else {
        toast.error('Failed to fetch exams');
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Error loading exams');
    } finally {
      setLoading(false);
    }
  };

  // Filter out orphaned assignments and group by course
  const groupedAssignments = assignments
    .filter(assignment => assignment.courseId && assignment.courseId._id)
    .reduce((acc, assignment) => {
      const courseId = assignment.courseId._id;
      const courseTitle = assignment.courseId.title;
      
      if (!acc[courseId]) {
        acc[courseId] = {
          title: courseTitle,
          assignments: []
        };
      }
      acc[courseId].assignments.push(assignment);
      return acc;
    }, {});

  // Convert grouped object to array and sort courses (English before Bengali)
  const sortedGroups = Object.values(groupedAssignments).sort((a, b) => {
    const aIsBengali = a.title.toLowerCase().includes('bengali');
    const bIsBengali = b.title.toLowerCase().includes('bengali');
    
    if (aIsBengali && !bIsBengali) return 1;
    if (!aIsBengali && bIsBengali) return -1;
    return a.title.localeCompare(b.title);
  });

  // Sort assignments within each course alphabetically
  sortedGroups.forEach(group => {
    group.assignments.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div 
        className="relative overflow-hidden py-8 md:py-12 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url("https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")'
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <FiAward className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Certification Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4 leading-tight">
            Certification Exams
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
            Take tests for your enrolled courses to earn your certificates.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/verify-certificate')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 font-bold rounded-full hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FiCheckCircle className="w-5 h-5" />
              Verify a Certificate
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {Object.keys(groupedAssignments).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-full mb-4">
              <FiBook className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Exams Available</h3>
            <p className="text-gray-500">Check back later for new certification exams.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedGroups.map((group, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-teal-500 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-900">{group.title}</h2>
                  </div>
                  <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                    {group.assignments.length} {group.assignments.length === 1 ? 'Exam' : 'Exams'}
                  </div>
                </div>
                
                <div className={`grid gap-5 ${
                  group.assignments.length === 1 ? 'grid-cols-1 max-w-4xl' : 
                  group.assignments.length === 2 ? 'md:grid-cols-2 max-w-5xl' : 
                  'md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {group.assignments.map((assignment) => (
                    <div 
                      key={assignment._id}
                      className={`group flex bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 border border-gray-100/50 overflow-hidden h-full ${
                        group.assignments.length === 1 ? 'flex-col sm:flex-row' : 'flex-col'
                      }`}
                    >
                      <div className={`relative overflow-hidden ${
                        group.assignments.length === 1 ? 'sm:w-2/5 lg:w-1/3 min-h-[200px]' : 'aspect-video'
                      }`}>
                        <img
                          src={assignment.courseId?.thumbnail || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400'}
                          alt={assignment.title}
                          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                            group.assignments.length === 1 ? 'absolute inset-0' : ''
                          }`}
                        />
                      </div>

                      <div className={`p-5 flex flex-col flex-1 ${
                        group.assignments.length === 1 ? 'sm:p-8 justify-center' : ''
                      }`}>
                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-teal-600 transition-colors">
                          {assignment.title}
                        </h3>
                        {assignment.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed flex-1">
                            {assignment.description}
                          </p>
                        )}
                        
                        <div className="mt-auto">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-5 pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-1.5 font-medium">
                              <FiClock className="text-teal-500" />
                              <span>{assignment.timeLimit} mins</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <FiAward className="text-teal-500" />
                              <span>{assignment.totalPoints} pts</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (!user) {
                                toast.error('Please login to take the exam');
                                navigate('/login');
                              } else {
                                navigate(`/courses/${assignment.courseId?._id}/assignment/${assignment._id}`);
                              }
                            }}
                            className="block w-full py-2.5 bg-teal-600 text-white text-center rounded-xl hover:bg-teal-700 transition-all duration-300 shadow-md hover:shadow-lg font-bold text-sm transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                          >
                           Start Exam
                            <FiChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Banner */}
      {Object.keys(groupedAssignments).length > 0 && (
        <div className="bg-white border-t border-gray-100 mt-10 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <FiBarChart2 className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">{sortedGroups.length}</div>
                  <div className="text-xs text-gray-500">Courses</div>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <FiBook className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {assignments.filter(a => a.courseId && a.courseId._id).length}
                  </div>
                  <div className="text-xs text-gray-500">Total Exams</div>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <FiTrendingUp className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">Certify</div>
                  <div className="text-xs text-gray-500">Your Skills</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}