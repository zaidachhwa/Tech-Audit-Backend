import Assignment from "../models/assignment.model.js";
import Student from "../models/student.model.js";

export const createAssignment = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

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
      const students = await Student.find({
        batchName,
        batchNumber,
      }).select("_id");

      if (!students.length) {
        return res.status(404).json({ message: "No students found" });
      }

      const assignments = students.map((s) => ({
        batchName,
        batchNumber,
        student: s._id,
        parameters: cleanParams,
        date,
        comment,
      }));

      await Assignment.insertMany(assignments);

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