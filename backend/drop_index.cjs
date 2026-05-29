const mongoose = require('mongoose');

const uri = "mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    const db = mongoose.connection.db;
    const collection = db.collection('teacherapplications');
    
    console.log("Dropping index createdAt_1...");
    await collection.dropIndex('createdAt_1');
    console.log("Successfully dropped createdAt_1 index.");
    
    const indexes = await collection.indexes();
    console.log("Current Indexes:");
    console.log(JSON.stringify(indexes, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
