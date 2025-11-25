import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Teacher } from "../models/teacher.model.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// REGISTER TEACHER (pending approval)
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
      isActive: false, // pending admin approval
    });

    return res.status(201).json({
      message: "Teacher registered. Awaiting admin approval.",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        isActive: teacher.isActive,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// LOGIN TEACHER (approval required)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(400).json({ message: "Invalid credentials" });

    // NEW: must be approved
    if (!teacher.isActive)
      return res.status(403).json({
        message: "Your account is pending approval from admin",
      });

    const ok = await bcrypt.compare(password, teacher.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: teacher._id, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Logged in successfully",
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: Approve Teacher
router.patch("/approve/:teacherId", verifyToken, isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = true;
    await teacher.save();

    res.json({ message: "Teacher approved successfully", teacher });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ADMIN: Reject Teacher
router.patch("/reject/:teacherId", verifyToken, isAdmin, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = false;
    await teacher.save();

    res.json({ message: "Teacher rejected", teacher });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Get all teachers (Admin)
router.get("/list", verifyToken, isAdmin, async (req, res) => {
  try {
    const teachers = await Teacher.find().select("-password");
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
