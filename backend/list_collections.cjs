const mongoose = require('mongoose');
const uri = 'mongodb+srv://vishaldgtldb:Ram%40123@cluster0.llotsdg.mongodb.net/TreeCampus?retryWrites=true&w=majority&appName=Cluster0';
async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', JSON.stringify(collections.map(c => c.name)));
  await mongoose.disconnect();
}
run().catch(console.error);
