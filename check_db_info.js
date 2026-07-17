import mongoose from "mongoose";
import dotenv from "dotenv";
import { Admin } from "./models/admin.model.js";
import { Teacher } from "./models/teacher.model.js";
import { Student } from "./models/student.model.js";

dotenv.config({ path: "./.env" });

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected.");
    const admins = await Admin.find({});
    console.log("=== ADMINS ===");
    admins.forEach(a => console.log(`Name: ${a.name}, Email: ${a.email}`));

    const teachers = await Teacher.find({});
    console.log("=== TEACHERS ===");
    teachers.forEach(t => console.log(`Name: ${t.name}, Email: ${t.email}`));

    const students = await Student.find({});
    console.log("=== STUDENTS ===");
    students.forEach(s => console.log(`Name: ${s.name}, Email: ${s.email}`));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
check();
