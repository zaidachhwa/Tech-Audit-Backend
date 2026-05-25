const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    const Batch = require('./models/batch.model.js').default;
    const Teacher = require('./models/teacher.model.js').default;
    const Schedule = require('./models/schedule.model.js').default;

    console.log('Indexes:', await Schedule.collection.indexes());

    const schedules = await Schedule.find({}).populate('batch', 'batch_name batch_no');
    console.log('Schedules count:', schedules.length);
    schedules.forEach(s => {
      console.log(`ID: ${s._id}, Subject: "${s.subject}", Batch: "${s.batch?.batch_name || 'N/A'}" (${s.batch?._id}), LecturesCount: ${s.lectures?.length}`);
    });
  } catch(e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
