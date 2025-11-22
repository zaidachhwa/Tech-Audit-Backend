import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Teacher } from "../models/teacher.model.js";
import { isAdmin, verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// REGISTER TEACHER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, subjects } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await Teacher.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Teacher already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const teacher = await Teacher.create({
      name,
      email,
      password: hashed,
      subjects: subjects || [],
    });

    const token = jwt.sign(
      { id: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Teacher registered",
      token,
      teacher: { id: teacher._id, name, email },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// LOGIN TEACHER
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, teacher.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Logged in",
      token,
      teacher: { id: teacher._id, name: teacher.name, email: teacher.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all teachers (for admin)
router.get("/list", verifyToken, isAdmin, async (req, res) => {
  try {
    const teachers = await Teacher.find().select("-password");
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
