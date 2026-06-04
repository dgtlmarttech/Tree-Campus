const mongoose = require('mongoose');
const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  // Find a user with enrolledCourses
  const user = await db.collection('users').findOne({ 'enrolledCourses.0': { $exists: true } });
  if (!user) {
    console.log("No user with enrolled courses found");
    process.exit();
  }
  console.log("User enrolledCourses:", user.enrolledCourses);
  
  // Test how Mongoose would query it
  // But wait, the schema is in the code. I'll just use the raw db query
  const courseIds = user.enrolledCourses.map(e => e.courseId || e);
  console.log("Mapped courseIds:", courseIds);
  
  process.exit();
}
check();
