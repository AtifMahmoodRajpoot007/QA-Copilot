require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  console.log('Testing Mongoose connection...');
  console.log('URI:', process.env.MONGODB_URI ? 'Defined' : 'UNDEFINED');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Mongoose connected successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Mongoose connection failed:', err);
  }
}

test();
