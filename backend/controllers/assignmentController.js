import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import Progress from '../models/Progress.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { sendAssignmentResultsEmail } from '../utils/zeptoEmail.js';

// @desc    Create assignment (admin only)
// @route   POST /api/assignments/course/:courseId
// @access  Private/Admin
export const createAssignment = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { title, description, questions, passingScore, timeLimit } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Calculate total points
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    const assignment = await Assignment.create({
      courseId,
      title,
      description,
      questions,
      passingScore: passingScore || 60,
      timeLimit: timeLimit || 60,
      totalPoints,
      totalQuestions: questions.length
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course assignments
// @route   GET /api/assignments/course/:courseId
// @access  Public
export const getCourseAssignments = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const assignments = await Assignment.find({ courseId })
      .select('-questions.correctAnswer') // Don't show answers to students
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assignments across all courses
// @route   GET /api/assignments
// @access  Public
export const getAllAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find()
      .populate('courseId', 'title thumbnail') // Populate course title and thumbnail
      .select('-questions.correctAnswer') // Don't show answers
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course assignments for ADMIN (includes correct answers)
// @route   GET /api/assignments/course/:courseId/admin
// @access  Private/Admin
export const getCourseAssignmentsAdmin = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    console.log(`DEBUG: Fetching assignments for course (admin): ${courseId}`);

    const assignments = await Assignment.find({ courseId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:assignmentId
// @access  Private
export const getAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check assignment eligibility
// @route   GET /api/assignments/:assignmentId/check-eligibility
// @access  Private
export const checkAssignmentEligibility = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user._id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Fetch enrollment to check time lock (30 days from enrollment)
    const enrollment = await Enrollment.findOne({ user: userId, course: assignment.courseId });
    const userDoc = await User.findById(userId);
    
    // Find the enrolledAt date either from Enrollment model, User's enrolledCourses array, or user creation date
    let enrolledAt = null;
    if (enrollment && enrollment.enrolledAt) {
        enrolledAt = enrollment.enrolledAt;
    } else if (userDoc && userDoc.enrolledCourses) {
        const ec = userDoc.enrolledCourses.find(c => c.courseId.toString() === assignment.courseId.toString());
        if (ec && ec.enrolledAt) {
            enrolledAt = ec.enrolledAt;
        }
    }
    
    if (!enrolledAt) {
        enrolledAt = userDoc.createdAt;
    }

    const daysSinceEnrollment = Math.floor((Date.now() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24));
    const requiredDays = 30; // Every course requires 30 days from its own enrollment date

    if (daysSinceEnrollment < requiredDays) {
        const daysLeft = requiredDays - daysSinceEnrollment;
        return res.status(200).json({
            success: true,
            canTake: false,
            reason: `This assignment will unlock in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`,
            daysLeft
        });
    }

    // Check all submissions for the student
    const allSubmissions = await AssignmentSubmission.find({
      userId,
      assignmentId
    }).sort({ submittedAt: -1 });

    const attemptCount = allSubmissions.length;
    const maxAttempts = 3;
    const lastSubmission = allSubmissions[0]; // Most recent submission

    // If student passed, don't allow retake
    if (lastSubmission?.passed) {
      return res.status(200).json({
        success: true,
        canTake: false,
        alreadySubmitted: true,
        alreadyPassed: true,
        passed: lastSubmission.passed,
        score: lastSubmission.percentageScore,
        certificateId: lastSubmission.certificateId,
        message: `🎉 Congratulations! You already passed this assignment with ${lastSubmission.percentageScore}% score and earned a certificate.`
      });
    }

    // If student failed but attempts exhausted
    if (attemptCount >= maxAttempts) {
      return res.status(200).json({
        success: true,
        canTake: false,
        attemptsExhausted: true,
        attemptCount,
        maxAttempts,
        score: lastSubmission?.percentageScore || 0,
        message: `❌ You have used all ${maxAttempts} attempts. Unfortunately, you did not pass this assignment.`
      });
    }

    // Student can retake (failed and attempts < 3)
    res.status(200).json({
      success: true,
      canTake: true,
      alreadySubmitted: attemptCount > 0,
      attemptCount,
      maxAttempts,
      remainingAttempts: maxAttempts - attemptCount,
      score: lastSubmission?.percentageScore || null,
      passed: lastSubmission?.passed || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:assignmentId/submit
// @access  Private
export const submitAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { answers } = req.body;
    const userId = req.user._id;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    const submittedAnswers = [];

    answers.forEach(answer => {
      const question = assignment.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return;

      totalPoints += question.points || 1;

      // Convert numeric correctAnswer index to the actual option text for comparison
      const correctOptionText = question.options[Number(question.correctAnswer)] || question.correctAnswer;
      const isCorrect = correctOptionText === answer.userAnswer;
      const pointsEarned = isCorrect ? (question.points || 1) : 0;

      if (isCorrect) earnedPoints += pointsEarned;

      submittedAnswers.push({
        questionId: answer.questionId,
        userAnswer: answer.userAnswer,
        isCorrect,
        pointsEarned
      });
    });

    const percentageScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentageScore >= assignment.passingScore;

    // Create submission
    const submission = await AssignmentSubmission.create({
      userId,
      courseId: assignment.courseId,
      assignmentId,
      answers: submittedAnswers,
      totalScore: earnedPoints,
      percentageScore,
      passed,
      status: 'submitted',
      submittedAt: new Date()
    });

    // If passed, generate certificate
    let certificate = null;
    if (passed) {
      const course = await Course.findById(assignment.courseId);
      const user = await User.findById(userId);

      // Generate certificate for this assignment unconditionally
      certificate = await Certificate.create({
        userId,
        courseId: assignment.courseId,
        type: 'assignment',
        score: percentageScore,
        courseTitle: course.certificateTitle || course.title,
        userName: user.name,
        certificateUrl: `/certificates/${submission._id}`
      });

      // Link certificate to submission
      await AssignmentSubmission.findByIdAndUpdate(submission._id, {
        certificateId: certificate._id
      });

      // Add certificate to user
      await User.findByIdAndUpdate(userId, {
        $push: { certificates: certificate._id }
      });

      // ✅ SYNC: Update Progress model
      await Progress.findOneAndUpdate(
        { user: userId, course: assignment.courseId },
        {
          $set: {
            certificateIssued: true,
            certificateUrl: certificate ? `/certificates/${certificate._id}` : ''
          }
        },
        { upsert: false }
      );
      console.log(`✅ Progress synced: certificateIssued=true for user ${userId}`);

      // ✅ SYNC: Update Enrollment model
      await Enrollment.findOneAndUpdate(
        { user: userId, course: assignment.courseId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date()
          }
        },
        { upsert: false }
      );
      console.log(`✅ Enrollment synced: status=completed for user ${userId}`);

      // ✅ SYNC: Update User.enrolledCourses completedAt
      await User.updateOne(
        { _id: userId, 'enrolledCourses.courseId': assignment.courseId },
        {
          $set: { 'enrolledCourses.$.completedAt': new Date() }
        }
      );
      console.log(`✅ User.enrolledCourses synced: completedAt set for user ${userId}`);

      // Send email notification in background
      sendAssignmentResultsEmail(user.email, user.name, {
        courseTitle: course.title,
        score: percentageScore,
        passed: true,
        certificateId: certificate?._id
      }).catch(err => {
        console.error('❌ Failed to send assignment results email:', err.message);
      });
    } else {
      // Send email notification for failed assignment
      const course = await Course.findById(assignment.courseId);
      const user = await User.findById(userId);

      sendAssignmentResultsEmail(user.email, user.name, {
        courseTitle: course.title,
        score: percentageScore,
        passed: false,
        passingScore: assignment.passingScore
      }).catch(err => {
        console.error('❌ Failed to send assignment results email:', err.message);
      });
    }

    res.status(200).json({
      success: true,
      message: passed ? 'Assignment passed! Certificate generated.' : 'Assignment submitted. Score below passing.',
      data: {
        submission: {
          score: percentageScore,
          passed,
          totalScore: earnedPoints,
          totalPoints
        },
        certificate: certificate ? { _id: certificate._id } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignment submission
// @route   GET /api/assignments/:assignmentId/submission
// @access  Private
export const getSubmission = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user._id;

    const submission = await AssignmentSubmission.findOne({
      userId,
      assignmentId
    }).populate('certificateId');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'No submission found' });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assignment submissions across all courses (Admin only)
// @route   GET /api/assignments/submissions/all
// @access  Private/Admin
export const getAllSubmissionsAdmin = async (req, res, next) => {
  try {
    const submissions = await AssignmentSubmission.find()
      .populate('userId', 'name email phone')
      .populate('courseId', 'title')
      .populate('assignmentId', 'title')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a specific assignment submission (Admin only)
// @route   DELETE /api/assignments/submissions/:id
// @access  Private/Admin
export const deleteSubmissionAdmin = async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findByIdAndDelete(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    res.status(200).json({ success: true, message: 'Submission deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update assignment (admin only)
// @route   PUT /api/assignments/:assignmentId
// @access  Private/Admin
export const updateAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, questions, passingScore, timeLimit } = req.body;

    let assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Calculate total points if questions updated
    if (questions) {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      assignment.totalPoints = totalPoints;
      assignment.totalQuestions = questions.length;
      assignment.questions = questions;
    }

    assignment.title = title || assignment.title;
    assignment.description = description || assignment.description;
    assignment.passingScore = passingScore !== undefined ? passingScore : assignment.passingScore;
    assignment.timeLimit = timeLimit || assignment.timeLimit;

    await assignment.save();

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete assignment (admin only)
// @route   DELETE /api/assignments/:assignmentId
// @access  Private/Admin
export const deleteAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findByIdAndDelete(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Also delete all submissions for this assignment
    await AssignmentSubmission.deleteMany({ assignmentId });

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
