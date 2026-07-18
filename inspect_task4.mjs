import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
import { Admin } from "./models/admin.model.js";
import { Teacher } from "./models/teacher.model.js";
import { Syllabus } from "./models/syllabus.model.js";

await mongoose.connect(process.env.MONGODB_URL);

const admin = await Admin.findOne();
const teachers = await Teacher.find().limit(3);
const syllabi = await Syllabus.find().limit(5);

console.log("ADMIN_ID", admin?._id?.toString());
console.log("TEACHERS", teachers.map(t => ({ id: t._id.toString(), name: t.name, subjects: t.subjects })));
console.log("SYLLABI", syllabi.map(s => ({ id: s._id.toString(), subject: s.subject, assignedTeachers: s.assignedTeachers })));

const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
console.log("TOKEN", token);

await mongoose.disconnect();
