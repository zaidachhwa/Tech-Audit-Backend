import Assignment from "../models/assignment.model.js";
import Student from "../models/student.model.js";

// Normalize batch names (match frontend cleanup)
const cleanBatchName = (name) => name?.replace(/\s+/g, "").toUpperCase();

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
      // student documents use `batch_name` and `batch_no` (strings)
      // Try multiple query patterns to find matching students
      const cleanName = cleanBatchName(batchName);

      // Debug: log what we're searching for
      console.log("🔍 BATCH QUERY DEBUG:", {
        cleanName,
        batchNumber,
        batchNumberStr: String(batchNumber),
      });

      // Try flexible matching: case-insensitive, with/without spaces
      let students = await Student.find({
        batch_name: new RegExp(`^${cleanName.replace(/\s/g, "")}$`, "i"),
        batch_no: String(batchNumber),
      }).select("_id");

      // If not found, try querying by batchNumber as number
      if (!students.length) {
        console.log("❌ Regex match failed, trying number match...");
        students = await Student.find({
          batch_name: new RegExp(`^${cleanName.replace(/\s/g, "")}$`, "i"),
          batch_no: batchNumber,
        }).select("_id");
      }

      // If still not found, log sample students for debugging
      if (!students.length) {
        const samples = await Student.find().limit(2).select("batch_name batch_no name");
        console.log("❌ NO STUDENTS FOUND. Sample data:", samples);
        return res.status(404).json({
          message: "No students found",
          debugInfo: { cleanName, batchNumber, queriedFor: `batch_name: ${cleanName}, batch_no: ${batchNumber}` },
          samples,
        });
      }

      console.log("✅ Found", students.length, "students");

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