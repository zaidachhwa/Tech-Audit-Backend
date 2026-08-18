import { Admin } from "../models/admin.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env.js";
import { Student } from "../models/student.model.js";

export const RegisterAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: "Admin exists" });
    const hashed = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({ name, email, password: hashed });
    const token = jwt.sign({ id: newAdmin._id, role: "admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.status(201).json({
      message: "Admin created",
      token,
      admin: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });
    email = String(email).trim().toLowerCase();
    password = String(password).trim();
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: admin._id, role: "admin" }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.status(200).json({
      message: "Logged in",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("Error in admin login:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const approveStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.isActive = true;
    await student.save();

    return res.status(200).json({
      message: "Student approved successfully",
      student,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const rejectStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.isActive = false;
    await student.save();

    return res.status(200).json({
      message: "Student rejected (deactivated)",
      student,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
