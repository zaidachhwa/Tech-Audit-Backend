import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { Syllabus } from "../models/syllabus.model.js";
import Homework from "../models/homework.model.js";
import { Attendance } from "../models/attendance.model.js";
import { StudentAttendance } from "../models/studentAttendance.model.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { sendStudentCredentials, generateRandomPassword } from "../utils/email.js";
import { getTeacherBatchIds } from "../utils/teacherScope.js";

const JWT_SECRET = process.env.JWT_SECRET;

/* Register student */
export const registerStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      batch_name,
      batch_no,
      phoneNo,
      enrollmentNo,
      rollNo,
      course,
      semester,
      department,
      dob,
      gender,
      parentEmail,
      parentPhoneNo,
      profilePhoto,
      idCardPhoto,
      aadhaarPhoto,
      customFields
    } = req.body;

    if (!name || !email || !batch_name || !batch_no) {
      return res.status(400).json({ message: "Name, email, and batch name/number are required" });
    }

    // Detect if this is an admin/teacher action by decoding authorization header
    let isAdminAction = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === "admin" || decoded.role === "teacher") {
          isAdminAction = true;
        }
      } catch (err) {
        // Ignore token verify error for public action
      }
    }

    let finalPassword = password;
    let shouldSendEmail = false;

    if (!finalPassword || isAdminAction) {
      if (!finalPassword) {
        finalPassword = generateRandomPassword();
      }
      shouldSendEmail = true;
    }

    const exists = await Student.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Student already exists" });

    const hashed = await bcrypt.hash(finalPassword, 10);

    const student = await Student.create({
      name,
      email,
      password: hashed,
      batch_name,
      batch_no,
      phoneNo: phoneNo || "",
      enrollmentNo: enrollmentNo || "",
      rollNo: rollNo || "",
      course: course || "",
      semester: semester || "",
      department: department || "",
      dob: dob || "",
      gender: gender || "",
      parentEmail: parentEmail || "",
      parentPhoneNo: parentPhoneNo || "",
      profilePhoto: profilePhoto || "",
      idCardPhoto: idCardPhoto || "",
      aadhaarPhoto: aadhaarPhoto || "",
      customFields: customFields || {},
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

    // Send credentials via email if applicable
    if (shouldSendEmail) {
      await sendStudentCredentials(email, name, finalPassword);
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

    // Update last login timestamp
    student.lastLogin = new Date();
    await student.save();

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

    // 1. Find student's batch
    const batch = await Batch.findOne({ students: id }).lean();

    // 2. Find subjects & progress
    const subjectsProgress = [];
    const teachersMap = new Map();

    if (batch) {
      const batchSyllabi = await BatchSyllabus.find({ batch: batch._id })
        .populate("syllabus")
        .lean();

      for (const bs of batchSyllabi) {
        const syllabus = bs.syllabus;
        if (!syllabus) continue;

        const batchLectures = await BatchLecture.find({
          batch: batch._id,
          syllabus: syllabus._id,
          lectureType: "Normal"
        });

        const total = batchLectures.length;
        const completed = batchLectures.filter(l => l.completionStatus === "Completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Collect teachers who teach this batch/syllabus
        const mappedLectures = await BatchLecture.find({
          batch: batch._id,
          syllabus: syllabus._id
        }).populate("assignedTo", "name email");

        mappedLectures.forEach(ml => {
          if (ml.assignedTo) {
            teachersMap.set(String(ml.assignedTo._id), ml.assignedTo.name);
          }
        });

        subjectsProgress.push({
          subjectId: syllabus._id,
          subjectName: syllabus.subject || syllabus.name,
          progress
        });
      }
    }

    // 3. Academic Info
    const academicInfo = {
      assignedSubjects: subjectsProgress.map(s => s.subjectName),
      assignedTeachers: Array.from(teachersMap.values()),
      batchDetails: batch ? `${batch.batch_name} (No. ${batch.batch_no})` : "N/A",
      currentSemester: student.semester || "N/A",
      courseInformation: student.course || "N/A",
      subjectProgress: subjectsProgress
    };

    // 4. Attendance Summary
    let presentCount = 0;
    let absentCount = 0;
    if (batch) {
      const attendanceRecords = await Attendance.find({
        batch: batch._id,
        "records.student": id
      });
      attendanceRecords.forEach((record) => {
        const studentRec = record.records.find((r) => String(r.student) === String(id));
        if (studentRec) {
          if (studentRec.status === "Present" || studentRec.status === "present") presentCount++;
          else if (studentRec.status === "Absent" || studentRec.status === "absent") absentCount++;
        }
      });
    }
    const totalClasses = presentCount + absentCount;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    const attendanceSummary = {
      totalClasses,
      present: presentCount,
      absent: absentCount,
      percentage: attendancePercentage
    };

    // 5. Homework Summary
    const homeworkHistory = await Homework.find({ student: id })
      .populate("lecture", "title")
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const totalHomework = homeworkHistory.length;
    const submitted = homeworkHistory.filter(h => h.status !== "assigned").length;
    const approved = homeworkHistory.filter(h => h.status === "approved").length;
    const pending = homeworkHistory.filter(h => h.status === "pending_review").length;
    const rejected = homeworkHistory.filter(h => h.status === "rejected").length;

    const homeworkSummary = {
      totalHomework,
      submitted,
      pending,
      approved,
      rejected,
      history: homeworkHistory
    };

    // 6. Lecture Progress
    let totalLectures = 0;
    let completedLectures = 0;
    let referenceCompleted = 0;

    if (batch) {
      const allBatchLectures = await BatchLecture.find({ batch: batch._id });
      const normalLectures = allBatchLectures.filter(l => (l.lectureType || "Normal") === "Normal");
      const refLectures = allBatchLectures.filter(l => (l.lectureType || "Normal") === "Reference");

      totalLectures = normalLectures.length;
      completedLectures = normalLectures.filter(l => l.completionStatus === "Completed").length;
      referenceCompleted = refLectures.filter(l => l.completionStatus === "Completed").length;
    }

    const lectureProgress = {
      totalLectures,
      completedLectures,
      remainingLectures: totalLectures - completedLectures,
      referenceLecturesCompleted: referenceCompleted
    };

    // 7. Activity Timeline
    const activityTimeline = [];
    const logs = await ActivityLog.find({ user: id }).sort({ createdAt: -1 }).limit(10).lean();
    logs.forEach(log => {
      activityTimeline.push({
        type: "log",
        title: log.action,
        description: log.details || "",
        timestamp: log.createdAt
      });
    });

    homeworkHistory.slice(0, 5).forEach(hw => {
      activityTimeline.push({
        type: "homework",
        title: `Homework: ${hw.status}`,
        description: `Lecture: ${hw.lecture?.title || "N/A"} - Checked by: ${hw.assignedBy?.name || "Teacher"}`,
        timestamp: hw.updatedAt
      });
    });

    activityTimeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 8. Documents
    const documents = [
      { name: "Profile Photo", url: student.profilePhoto || "", type: "image" },
      { name: "Student ID Card", url: student.idCardPhoto || "", type: "document" },
      { name: "Aadhaar / Identity Document", url: student.aadhaarPhoto || "", type: "document" }
    ].filter(doc => doc.url);

    return res.status(200).json({
      student,
      academicInfo,
      attendanceSummary,
      homeworkSummary,
      lectureProgress,
      activityTimeline: activityTimeline.slice(0, 10),
      documents
    });
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

    // 🔒 RESTRICT TEACHERS TO THEIR ASSIGNED BATCHES
    if (req.user && req.user.role === "teacher") {
      const allBatchIds = await getTeacherBatchIds(req.user.id);
      const teacherBatches = await Batch.find({ _id: { $in: allBatchIds } }).lean();

      if (teacherBatches.length > 0) {
        const batchConditions = teacherBatches.map(b => ({
          batch_name: { $regex: new RegExp(`^${b.batch_name.trim()}$`, "i") },
          batch_no: { $regex: new RegExp(`^${b.batch_no.toString().trim()}$`, "i") }
        }));
        
        if (q.$or) {
          q = { $and: [q, { $or: batchConditions }] };
        } else {
          q.$or = batchConditions;
        }
      } else {
        q._id = null; // No assigned batches -> 0 students
      }
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

    // Delete all attendance records associated with this student
    await StudentAttendance.deleteMany({ student: student._id });

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
    const { name, email, password, batch_name, batch_no, phoneNo, parentEmail, parentPhoneNo, isActive, customFields } = req.body;

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
    if (phoneNo !== undefined) student.phoneNo = phoneNo;
    if (parentEmail !== undefined) student.parentEmail = parentEmail;
    if (parentPhoneNo !== undefined) student.parentPhoneNo = parentPhoneNo;
    if (isActive !== undefined) student.isActive = isActive;
    if (customFields) {
      student.customFields = { ...student.customFields, ...customFields };
    }

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
          .json({ message: "Wrong old password." });

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