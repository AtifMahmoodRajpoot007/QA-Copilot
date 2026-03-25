const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function clearDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found');
    await mongoose.connect(uri);
    await mongoose.connection.db.dropDatabase();
    console.log('Database cleared successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDB();
