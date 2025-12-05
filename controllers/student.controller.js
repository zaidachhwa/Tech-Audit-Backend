// controllers/student.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";

const JWT_SECRET = process.env.JWT_SECRET;

/* Register student */
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
      // isActive: false  -> default
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

/* Login student */
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const student = await Student.findOne({ email });
    if (!student)
      return res.status(400).json({ message: "Invalid credentials" });

    // must be approved by admin
    if (student.isActive === false) {
      return res
        .status(403)
        .json({ message: "Your account is pending approval from the admin" });
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
        role: student.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Get single student (admin) */
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).select("-password").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    return res.status(200).json({ student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Get all students (admin) */
export const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // search query
    const q = search ? { name: { $regex: search, $options: "i" } } : {};

    // total count for pagination
    const total = await Student.countDocuments(q);

    // NEW: Count active & pending
    const totalActive = await Student.countDocuments({ ...q, isActive: true });
    const totalPending = await Student.countDocuments({
      ...q,
      isActive: false,
    });

    const students = await Student.find(q)
      .select("-password")
      .sort({ isActive: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      total,
      totalActive,
      totalPending,
      page: Number(page),
      limit: Number(limit),
      students,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Delete student (admin) */
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

/* Update student (admin) */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, batch_name, batch_no } = req.body;

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // If email changed, ensure uniqueness
    if (email && email !== student.email) {
      const existing = await Student.findOne({ email });
      if (existing)
        return res
          .status(400)
          .json({ message: "Email already in use by another student" });
    }

    const oldBatchName = student.batch_name;
    const oldBatchNo = student.batch_no;

    if (name) student.name = name;
    if (email) student.email = email;
    if (batch_name) student.batch_name = batch_name;
    if (typeof batch_no !== "undefined" && batch_no !== null)
      student.batch_no = batch_no;

    await student.save();

    const batchChanged =
      (batch_name && batch_name !== oldBatchName) ||
      (typeof batch_no !== "undefined" &&
        batch_no !== null &&
        batch_no !== oldBatchNo);

    if (batchChanged) {
      // remove from old batch
      await Batch.updateOne(
        { batch_name: oldBatchName, batch_no: oldBatchNo },
        { $pull: { students: student._id } }
      );

      // ensure new batch
      let newBatch = await Batch.findOne({
        batch_name: student.batch_name,
        batch_no: student.batch_no,
      });
      if (!newBatch) {
        newBatch = await Batch.create({
          batch_name: student.batch_name,
          batch_no: student.batch_no,
          students: [student._id],
        });
      } else {
        newBatch.students = newBatch.students || [];
        if (!newBatch.students.includes(student._id)) {
          newBatch.students.push(student._id);
          await newBatch.save();
        }
      }
    }

    const updated = await Student.findById(id).select("-password").lean();
    return res
      .status(200)
      .json({ message: "Student updated", student: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ---------------------
   Student self endpoints
   --------------------- */

/* GET /students/me */
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await Student.findById(userId).select("-password").lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    return res.status(200).json({ student });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* PATCH /students/me */
export const updateMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { name, email, currentPassword, newPassword } = req.body;
    const student = await Student.findById(userId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // If changing email ensure uniqueness
    if (email && email !== student.email) {
      const existing = await Student.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      student.email = email;
    }

    if (name) student.name = name;

    // If changing password: require currentPassword
    if (newPassword) {
      if (!currentPassword)
        return res
          .status(400)
          .json({ message: "currentPassword required to change password" });
      const ok = await bcrypt.compare(currentPassword, student.password);
      if (!ok)
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      student.password = await bcrypt.hash(newPassword, 10);
    }

    await student.save();
    const updated = await Student.findById(userId).select("-password").lean();
    return res
      .status(200)
      .json({ message: "Profile updated", student: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
