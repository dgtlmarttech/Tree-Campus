const mongoose = require('mongoose');
const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";

const User = require('./models/User.js').default || require('./models/User.js');
const Course = require('./models/Course.js').default || require('./models/Course.js');

async function test() {
  await mongoose.connect(uri);
  const user = await User.findOne({ 'enrolledCourses.0': { $exists: true } });
  
  if (!user) {
    console.log("No user found");
    process.exit();
  }
  
  console.log(`User has ${user.enrolledCourses.length} enrolled courses`);
  
  const coursesRaw = await Course.find({
    _id: { $in: user.enrolledCourses }
  });
  console.log(`Raw query found ${coursesRaw.length} courses`);
  
  const courseIds = user.enrolledCourses.map(e => e.courseId);
  const coursesCorrect = await Course.find({
    _id: { $in: courseIds }
  });
  console.log(`Correct query found ${coursesCorrect.length} courses`);
  
  process.exit();
}
test();
