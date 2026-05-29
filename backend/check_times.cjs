const mongoose = require('mongoose');
const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";
async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const docs = await db.collection('teacherapplications').find({}).toArray();
  docs.forEach(d => {
    console.log(d.name, d.createdAt, d.updatedAt);
  });
  process.exit();
}
run();
