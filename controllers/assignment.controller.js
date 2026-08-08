import Assignment from "../models/assignment.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import mongoose from "mongoose";

// Normalize batch names (match frontend cleanup)
const cleanBatchName = (name) => name?.replace(/\s+/g, "").toUpperCase();

export const createAssignment = async (req, res) => {
  try {
    const {
      batchName,
      batchNumber,
      student,
      parameters = [],
      date,
      mode,
      comment,
    } = req.body;

    // 🔒 BASIC VALIDATION
    if (!batchName || !batchNumber || !date || !mode) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🧹 CLEAN PARAMETERS (prevents crashes)
    const cleanParams = parameters.map((p) => ({
      name: p?.name || "",
      score: Number(p?.score) || 0,
    }));

    // =========================
    // 🔹 INDIVIDUAL ASSIGNMENT
    // =========================
    if (mode === "individual") {
      if (!student) {
        return res.status(400).json({ message: "Student required" });
      }

      const assignment = await Assignment.create({
        batchName,
        batchNumber,
        student,
        parameters: cleanParams,
        date,
        comment,
      });

      return res.status(201).json({
        message: "Assigned to student",
        assignment,
      });
    }

    // =========================
    // 🔹 BATCH ASSIGNMENT
    // =========================
    if (mode === "batch") {
      const { batchId } = req.body;
      const cleanName = cleanBatchName(batchName);
      
      let targetBatch = null;
      let students = []; // ✅ DECLARED HERE

      // 🔥 STRATEGY 1: Find by Batch ID (Sent by updated frontend)
      if (batchId) {
        targetBatch = await Batch.findById(batchId);
      }

      // 🔥 STRATEGY 2: Find by Batch Number + Name (Fallback)
      if (!targetBatch) {
        const allBatches = await Batch.find({ batch_no: String(batchNumber) });
        targetBatch = allBatches.find(b => cleanBatchName(b.batch_name) === cleanName);
      }

      if (targetBatch && targetBatch.students && targetBatch.students.length > 0) {
        students = targetBatch.students.map(id => ({ _id: id }));
      } else {
        // 🔥 STRATEGY 3: Final Fallback - Direct Student Search
        const permissiveRegex = `^${cleanName.split('').join('[\\s\\-]*')}$`;
        students = await Student.find({
          batch_name: { $regex: permissiveRegex, $options: "i" },
          batch_no: String(batchNumber),
        }).select("_id");
      }

      if (!students || !students.length) {
        return res.status(404).json({
          message: `No students found for batch ${batchName} (#${batchNumber})`,
          debug: { batchName, batchNumber, batchId, cleanName }
        });
      }

      const assignmentPromises = students.map((s) => {
        return Assignment.create({
          batchName,
          batchNumber,
          student: s._id,
          parameters: cleanParams,
          date,
          comment,
        });
      });
      
      await Promise.all(assignmentPromises);

      return res.status(201).json({
        message: `Assigned to ${students.length} students`,
      });
    }

    // ❌ INVALID MODE
    return res.status(400).json({ message: "Invalid mode" });

  } catch (err) {
    console.error("ASSIGNMENT ERROR:", err);
    return res.status(500).json({
      message: err.message || "Server error",
    });
  }
};

export const getAssignmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const assignments = await Assignment.find({
      $or: [{ batchNumber: batchId }, { batchName: batchId }],
    })
      .populate("student", "name email")
      .lean();

    return res.status(200).json({ count: assignments.length, assignments });
  } catch (err) {
    console.error("GET ASSIGNMENTS BY BATCH ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

export const getAssignmentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const assignments = await Assignment.find({ student: studentId })
      .populate("student", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ count: assignments.length, assignments });
  } catch (err) {
    console.error("GET ASSIGNMENTS BY STUDENT ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// GET all assignments for the logged-in student
export const getMyAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const assignments = await Assignment.find({ student: studentId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ count: assignments.length, assignments });
  } catch (err) {
    console.error("GET MY ASSIGNMENTS ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// PATCH assignment status by student
export const updateAssignmentStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    const studentId = req.user.id;

    if (!["Pending", "Done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const assignment = await Assignment.findOneAndUpdate(
      { _id: assignmentId, student: studentId },
      { status },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found or unauthorized" });
    }

    return res.status(200).json({ message: "Status updated", assignment });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};