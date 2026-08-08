import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import StudentAttendance from "./models/studentAttendance.model.js";
import { Attendance } from "./models/attendance.model.js";

async function clearAttendanceData() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    const resStudentAttendance = await StudentAttendance.deleteMany({});
    console.log(`Deleted ${resStudentAttendance.deletedCount} documents from StudentAttendance.`);

    const resAttendance = await Attendance.deleteMany({});
    console.log(`Deleted ${resAttendance.deletedCount} documents from Attendance.`);

    console.log("\nSuccessfully deleted all Student Attendance records from the database!");
    process.exit(0);
  } catch (err) {
    console.error("Error deleting attendance data:", err);
    process.exit(1);
  }
}

clearAttendanceData();
