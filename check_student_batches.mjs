import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Student from "./models/student.model.js";

async function checkBatches() {
  await mongoose.connect(process.env.MONGODB_URL);
  const students = await Student.find({});
  const countMap = {};
  students.forEach(s => {
    const key = `${s.batch_name} #${s.batch_no}`;
    countMap[key] = (countMap[key] || 0) + 1;
  });
  console.log("Batches distribution in DB:", countMap);

  const syStudents = students.filter(s => (s.batch_name || "").trim() === "SY");
  console.log("Students with batch_name='SY':", syStudents.map(s => ({ _id: s._id, name: s.name, batch_name: s.batch_name, batch_no: s.batch_no })));

  for (const s of syStudents) {
    s.batch_name = "BVOC SY";
    await s.save();
    console.log(`Updated ${s.name} batch_name to 'BVOC SY'`);
  }

  process.exit(0);
}

checkBatches();
