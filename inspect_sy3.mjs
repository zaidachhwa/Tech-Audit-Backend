import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Student from "./models/student.model.js";

async function inspectSY3() {
  await mongoose.connect(process.env.MONGODB_URL);
  const allStudents = await Student.find({});
  console.log("All students total:", allStudents.length);
  
  console.log("All Students Batch Names and Nos:");
  let fixedCount = 0;
  for (const s of allStudents) {
    const rawName = s.batch_name || "";
    const cleanName = rawName.trim();
    if (rawName !== cleanName) {
      console.log(`Fixing student [${s.name}]: "${rawName}" -> "${cleanName}"`);
      s.batch_name = cleanName;
      await s.save();
      fixedCount++;
    }
  }
  console.log(`Finished trimming batch_name for ${fixedCount} students.`);

  // Print final distribution
  const countMap = {};
  const updatedStudents = await Student.find({});
  updatedStudents.forEach(s => {
    const key = `${s.batch_name} #${s.batch_no}`;
    countMap[key] = (countMap[key] || 0) + 1;
  });
  console.log("Final clean batches distribution in DB:", countMap);

  process.exit(0);
}

inspectSY3();
