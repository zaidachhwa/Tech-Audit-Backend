// controllers/teacher.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Teacher } from "../models/teacher.model.js";

/* =====================================
   REGISTER TEACHER (pending approval)
===================================== */
export const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, subjects, phone } = req.body;

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
      phone: phone || "", // ⭐ ADDED
      subjects: subjects || [],
      isActive: false,
    });

    return res.status(201).json({
      message: "Teacher registered. Awaiting admin approval.",
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone, // ⭐ INCLUDED IN RETURN
        isActive: teacher.isActive,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================
   LOGIN TEACHER
===================================== */
export const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });
    if (!teacher)
      return res.status(400).json({ message: "Invalid credentials" });

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
        phone: teacher.phone, // ⭐ ADDED
        role: teacher.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   ADMIN: APPROVE TEACHER
===================================== */
export const approveTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = true;
    await teacher.save();

    res.json({ message: "Teacher approved successfully", teacher });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================
   ADMIN: REJECT TEACHER
===================================== */
export const rejectTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = false;
    await teacher.save();

    res.json({ message: "Teacher rejected", teacher });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================
   ADMIN: GET ALL TEACHERS
===================================== */
export const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().select("-password");
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   ADMIN: UPDATE TEACHER
===================================== */
export const updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { name, email, subjects, phone, isActive } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // email uniqueness check
    if (email && email !== teacher.email) {
      const existing = await Teacher.findOne({ email });
      if (existing)
        return res
          .status(400)
          .json({ message: "Email already in use by another teacher" });
    }

    if (name) teacher.name = name;
    if (email) teacher.email = email;
    if (phone) teacher.phone = phone; // ⭐ ADDED
    if (subjects) teacher.subjects = subjects;
    if (typeof isActive !== "undefined") teacher.isActive = isActive;

    await teacher.save();

    const updated = await Teacher.findById(teacherId).select("-password");

    res.json({ message: "Teacher updated", teacher: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =====================================
   ADMIN: DELETE TEACHER
===================================== */
export const deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    await Teacher.findByIdAndDelete(teacherId);

    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   GET TEACHER PROFILE  (GET /teachers/profile)
============================================================ */
export const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const teacher = await Teacher.findById(teacherId).select("-password");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({ user: teacher });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   UPDATE TEACHER PROFILE  (PATCH /teachers/profile)
   Editable fields: name, phone, location, bio
============================================================ */
export const updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const allowedFields = ["name", "phone", "location", "bio"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Teacher.findByIdAndUpdate(teacherId, updates, {
      new: true,
    }).select("-password");

    res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   CHANGE PASSWORD  (PATCH /teachers/change-password)
============================================================ */
export const changeTeacherPassword = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    teacher.password = hashed;

    await teacher.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   TEACHER STATS (GET /teachers/stats)
============================================================ */
export const getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.id;

    /**
     * IMPORTANT:
     * You must replace these models WITH your actual DB models.
     * I'm creating placeholders so your controller logic stays same.
     */

    const Topic = mongoose.model("Topic");
    const Batch = mongoose.model("Batch");
    const Student = mongoose.model("Student");

    const totalTopics = await Topic.countDocuments({ teacher: teacherId });
    const completedTopics = await Topic.countDocuments({
      teacher: teacherId,
      status: "completed",
    });
    const inProgressTopics = await Topic.countDocuments({
      teacher: teacherId,
      status: "in-progress",
    });

    const assignedBatches = await Batch.find({ teacher: teacherId }).select(
      "_id"
    );

    const totalStudents = await Student.countDocuments({
      batchId: { $in: assignedBatches.map((b) => b._id) },
    });

    const completionRate =
      totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    res.json({
      totalTopics,
      completedTopics,
      inProgressTopics,
      totalBatches: assignedBatches.length,
      totalStudents,
      completionRate,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
