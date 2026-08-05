import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Batch from "./models/batch.model.js";
import Student from "./models/student.model.js";

async function fixBatchCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    const batches = await Batch.find({});
    let updatedBatchesCount = 0;

    for (const b of batches) {
      const cleanName = (b.batch_name || "").trim();
      const cleanNo = String(b.batch_no || "").trim();

      if (b.batch_name !== cleanName || b.batch_no !== cleanNo) {
        console.log(`Updating Batch ID ${b._id}: name "${b.batch_name}" -> "${cleanName}", no "${b.batch_no}" -> "${cleanNo}"`);
        b.batch_name = cleanName;
        b.batch_no = cleanNo;
        b.name = cleanName;
        await b.save();
        updatedBatchesCount++;
      }
    }
    console.log(`Updated ${updatedBatchesCount} batches in Batch collection.`);

    const students = await Student.find({});
    let updatedStudentsCount = 0;
    for (const s of students) {
      const cleanName = (s.batch_name || "").trim();
      const cleanNo = String(s.batch_no || "").trim();

      if (s.batch_name !== cleanName || s.batch_no !== cleanNo) {
        console.log(`Updating Student ${s.name}: batch_name "${s.batch_name}" -> "${cleanName}", batch_no "${s.batch_no}" -> "${cleanNo}"`);
        s.batch_name = cleanName;
        s.batch_no = cleanNo;
        await s.save();
        updatedStudentsCount++;
      }
    }
    console.log(`Updated ${updatedStudentsCount} students in Student collection.`);

    console.log("\nALL BATCHES AFTER CLEANUP:");
    const finalBatches = await Batch.find({});
    finalBatches.forEach(b => console.log(`- ${b.batch_name} (#${b.batch_no}) [ID: ${b._id}]`));

    process.exit(0);
  } catch (err) {
    console.error("Error fixing batch collection:", err);
    process.exit(1);
  }
}

fixBatchCollection();
