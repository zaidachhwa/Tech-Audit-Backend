import mongoose from "mongoose";
import { StudentAttendance } from "./models/studentAttendance.model.js";
import { Student } from "./models/student.model.js";
import { MONGODB_URL } from "./config/env.js";

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log("Connected to MongoDB.");

    const attendanceRecords = await StudentAttendance.find();
    let deletedCount = 0;

    for (const record of attendanceRecords) {
      const student = await Student.findById(record.student);
      if (!student) {
        await StudentAttendance.findByIdAndDelete(record._id);
        deletedCount++;
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} orphaned attendance records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
