const mongoose = require('mongoose');

const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    const collection = db.collection('teacherapplications');
    const count = await collection.countDocuments();
    console.log(`Total teacher applications: ${count}`);
    const indexes = await collection.indexes();
    console.log("Indexes:");
    console.log(JSON.stringify(indexes, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
