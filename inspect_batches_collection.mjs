import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Batch from "./models/batch.model.js";
import Student from "./models/student.model.js";

async function inspectBatches() {
  await mongoose.connect(process.env.MONGODB_URL);
  
  const batches = await Batch.find({});
  console.log("ALL BATCHES IN BATCH COLLECTION:");
  batches.forEach(b => {
    console.log({
      _id: b._id,
      batch_name: JSON.stringify(b.batch_name),
      batch_no: b.batch_no,
      createdAt: b.createdAt
    });
  });

  const students = await Student.find({});
  const studentBatches = {};
  students.forEach(s => {
    const key = `${JSON.stringify(s.batch_name)} #${s.batch_no}`;
    studentBatches[key] = (studentBatches[key] || 0) + 1;
  });
  console.log("\nSTUDENT BATCHES IN STUDENT COLLECTION:");
  console.log(studentBatches);

  process.exit(0);
}

inspectBatches();
