import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, batch_name, batch_no } = req.body;
    if (!name || !email || !password || !batch_name || !batch_no) {
      return res.status(400).json({ message: "All fields required" });
    }
    const exists = await Student.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Student already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const student = await Student.create({
      name,
      email,
      password: hashed,
      batch_name,
      batch_no,
      // isActive: false  -> already default in schema
    });

    // add to batch if exists
    const batch = await Batch.findOne({ batch_name, batch_no });
    if (batch) {
      batch.students = batch.students || [];
      if (!batch.students.includes(student._id))
        batch.students.push(student._id);
      await batch.save();
    }

    const token = jwt.sign({ id: student._id, role: "student" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      message: "Student registered",
      token,
      student: { id: student._id, name, email, batch_name, batch_no },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const student = await Student.findOne({ email });
    if (!student)
      return res.status(400).json({ message: "Invalid credentials" });

    // NEW: student must be approved by admin
    if (student.isActive === false) {
      return res.status(403).json({
        message: "Your account is pending approval from the admin",
      });
    }

    const ok = await bcrypt.compare(password, student.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: student._id, role: "student" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      message: "Logged in",
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        batch_name: student.batch_name,
        batch_no: student.batch_no,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// NEW: Get single student
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).select("-password").lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const q = search ? { name: { $regex: search, $options: "i" } } : {};

    const total = await Student.countDocuments(q);
    const students = await Student.find(q)
      .select("-password")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res
      .status(200)
      .json({ total, page: Number(page), limit: Number(limit), students });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    await Batch.updateOne(
      { batch_name: student.batch_name, batch_no: student.batch_no },
      { $pull: { students: student._id } }
    );

    await Student.findByIdAndDelete(id);

    return res.status(200).json({ message: "Student deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
