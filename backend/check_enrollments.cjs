const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/DgtLmart/Tree Campus/backend/.env' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User.js').default;
  const Enrollment = require('./models/Enrollment.js').default;
  const Course = require('./models/Course.js').default;

  const totalUsers = await User.countDocuments({ role: 'student' });
  const userEnrollments = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    { $count: 'total' }
  ]);
  
  const enrollmentDocs = await Enrollment.countDocuments();
  const courses = await Course.countDocuments();
  
  console.log('Total Students:', totalUsers);
  console.log('Total user.enrolledCourses:', userEnrollments[0]?.total || 0);
  console.log('Total Enrollment docs:', enrollmentDocs);
  console.log('Total Courses:', courses);
  
  process.exit();
}).catch(console.error);
