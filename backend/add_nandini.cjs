const mongoose = require('mongoose');
const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";

async function addNandini() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const ts = 1779950662524; // from resume
  
  await db.collection('teacherapplications').insertOne({
    name: "Nandini Sandrawar",
    email: "nandinisandrawar_recovered@treecampus.in",
    phone: "9999999991", // Dummy phone
    resume: "https://res.cloudinary.com/dbbll23jz/raw/upload/v1779950663/treecampus/teacher_applications/resumes/nandini_danny_resume-4-1779950662524.pdf",
    resumePublicId: "treecampus/teacher_applications/resumes/nandini_danny_resume-4",
    demoVideo: "https://res.cloudinary.com/dbbll23jz/video/upload/v1779950666/treecampus/teacher_applications/demo_videos/VID-20260513-WA0007-1779950663845.mp4.mp4",
    demoVideoPublicId: "treecampus/teacher_applications/demo_videos/VID-20260513-WA0007",
    isPhoneVerified: true,
    status: "pending",
    createdAt: new Date(ts),
    updatedAt: new Date(ts)
  });
  
  console.log("Nandini Sandrawar added.");
  process.exit();
}
addNandini();
