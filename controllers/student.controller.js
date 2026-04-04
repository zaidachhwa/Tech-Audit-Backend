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
    });

    // attach to batch
    const batch = await Batch.findOne({ batch_name, batch_no });
    if (batch) {
      batch.students = batch.students || [];
      if (!batch.students.includes(student._id)) {
        batch.students.push(student._id);
      }
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

/* Get single student */
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

/* ✅ FIXED: Get students (with batch filter support) */
export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 150,
      search,
      batchName,
      batchNumber,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // base query (search)
    let q = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    // ✅ ADD FILTERING HERE (case-insensitive to handle mixed casing in DB)
    if (batchName) {
      q.batch_name = { $regex: new RegExp(`^${batchName.trim()}$`, "i") };
    }

    if (batchNumber) {
      q.batch_no = { $regex: new RegExp(`^${batchNumber.toString().trim()}$`, "i") };
    }

    const total = await Student.countDocuments(q);
    const totalActive = await Student.countDocuments({
      ...q,
      isActive: true,
    });
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

/* Delete student */
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ message: "Student not found" });

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

/* Update student */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, batch_name, batch_no, isActive } = req.body;

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ message: "Student not found" });

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
    if (password) student.password = await bcrypt.hash(password, 10);
    if (batch_name) student.batch_name = batch_name;
    if (batch_no !== undefined) student.batch_no = batch_no;
    if (isActive !== undefined) student.isActive = isActive;

    await student.save();

    const batchChanged =
      batch_name !== oldBatchName || batch_no !== oldBatchNo;

    if (batchChanged) {
      await Batch.updateOne(
        { batch_name: oldBatchName, batch_no: oldBatchNo },
        { $pull: { students: student._id } }
      );

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

    return res.status(200).json({
      message: "Student updated",
      student: updated,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* GET /students/me */
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const student = await Student.findById(userId)
      .select("-password")
      .lean();

    if (!student)
      return res.status(404).json({ message: "Student not found" });

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
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    if (email && email !== student.email) {
      const existing = await Student.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      student.email = email;
    }

    if (name) student.name = name;

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ message: "currentPassword required" });

      const ok = await bcrypt.compare(currentPassword, student.password);
      if (!ok)
        return res
          .status(400)
          .json({ message: "Current password incorrect" });

      student.password = await bcrypt.hash(newPassword, 10);
    }

    await student.save();

    const updated = await Student.findById(userId)
      .select("-password")
      .lean();

    return res.status(200).json({
      message: "Profile updated",
      student: updated,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const uploadStudentPhoto = async (req, res) => {
  try {
    const studentId = req.params.id === "me" ? req.user?.id : req.params.id;

    if (!studentId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ message: "No photo provided" });
    }

    if (!photo.startsWith("data:image/")) {
      return res.status(400).json({
        message: "Invalid image format. Must be base64 image",
      });
    }

    const student = await Student.findByIdAndUpdate(
      studentId,
      { profilePhoto: photo },
      { new: true }
    ).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Profile photo updated",
      profilePhoto: student.profilePhoto,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};