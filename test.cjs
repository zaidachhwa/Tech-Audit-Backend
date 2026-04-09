const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    const Batch = require('./models/batch.model.js').default;
    const Student = require('./models/student.model.js').default;

    const batches = await Batch.find({});
    console.log('Batches:');
    batches.forEach(b => console.log(`ID: ${b._id}, Name: "${b.batch_name}", No: "${b.batch_no}", StudentsCount: ${b.students?.length}`));

    const students = await Student.find({}, 'name batch_name batch_no isActive');
    console.log(`\nTotal Students in DB: ${students.length}`);
    for(let i=0; i<Math.min(5, students.length); i++) {
        console.log(`Student ${i}: name=${students[i].name}, batch_name="${students[i].batch_name}", batch_no="${students[i].batch_no}"`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
