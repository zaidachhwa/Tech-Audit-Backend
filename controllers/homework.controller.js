import Homework from "../models/homework.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import mongoose from "mongoose";

// Normalize batch names
const cleanBatchName = (name) => name?.replace(/\s+/g, "").toUpperCase();

/**
 * Assign Homework (Postman: POST /api/homework)
 */
export const createHomework = async (req, res) => {
  try {
    const {
      lectureId,
      title,
      description,
      comment, // alias
      dueDate,
      batchIds = []
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: "Title and dueDate are required" });
    }

    // Get all students enrolled in specified batches
    let targetStudents = [];
    if (batchIds && batchIds.length > 0) {
      const batches = await Batch.find({ _id: { $in: batchIds } });
      for (const batch of batches) {
        if (batch.students && batch.students.length > 0) {
          targetStudents = [...targetStudents, ...batch.students];
        }
      }
    }

    // If no students found in batches, check student model as fallback
    if (targetStudents.length === 0) {
      return res.status(404).json({ message: "No students found in the specified batches" });
    }

    // Deduplicate student IDs
    const studentIds = [...new Set(targetStudents.map(id => id.toString()))];

    const homeworkPromises = studentIds.map((studentId) => {
      return Homework.create({
        title,
        description: description || comment || "",
        comment: description || comment || "",
        dueDate,
        lecture: lectureId,
        student: studentId,
        assignedBy: req.user.id,
        status: "Assigned"
      });
    });

    await Promise.all(homeworkPromises);

    res.status(201).json({ message: `Homework assigned to ${studentIds.length} students` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Homework List (Postman: GET /api/homework)
 */
export const getHomework = async (req, res) => {
  try {
    const homeworkList = await Homework.find()
      .populate("student", "name email")
      .populate("assignedBy", "name email")
      .populate("lecture", "title")
      .lean();
    res.json(homeworkList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Homework Details (Postman: GET /api/homework/:id)
 */
export const getHomeworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id)
      .populate("student", "name email")
      .populate("assignedBy", "name email")
      .populate("lecture", "title");

    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    res.json(homework);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update Homework (Postman: PUT /api/homework/:id)
 */
export const updateHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Homework.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Homework not found" });
    }
    res.json({ message: "Homework updated successfully", homework: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Homework (Postman: DELETE /api/homework/:id)
 */
export const deleteHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Homework.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Homework not found" });
    }
    res.json({ message: "Homework deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Assigned Homework (Postman: GET /api/student/homework)
 */
export const getMyHomework = async (req, res) => {
  try {
    const studentId = req.user.id;
    const homeworkList = await Homework.find({ student: studentId })
      .populate("assignedBy", "name email")
      .populate("lecture", "title")
      .sort({ createdAt: -1 });

    res.json(homeworkList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submit Homework (Postman: POST /api/student/homework/:homeworkId/submit)
 */
export const submitHomework = async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { submissionText, attachment } = req.body;
    const studentId = req.user.id;

    const homework = await Homework.findOne({ _id: homeworkId, student: studentId });
    if (!homework) {
      return res.status(404).json({ message: "Homework not found or unauthorized" });
    }

    // Push new submission to submissions list
    homework.submissions.push({
      submissionText,
      fileName: attachment ? attachment.split("/").pop() : "attachment",
      fileUrl: attachment || "",
      status: "Pending Approval"
    });

    homework.status = "Pending Approval";
    await homework.save();

    res.json({ message: "Homework submitted successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submission History (Postman: GET /api/student/homework/history)
 */
export const getStudentHomeworkHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const homeworkList = await Homework.find({ student: studentId })
      .populate("lecture", "title")
      .select("title submissions lecture");

    const history = homeworkList.flatMap((hw) => 
      hw.submissions.map((sub) => ({
        homeworkId: hw._id,
        homeworkTitle: hw.title,
        lectureTitle: hw.lecture?.title || "Unknown Lecture",
        submissionId: sub._id,
        submissionText: sub.submissionText,
        fileUrl: sub.fileUrl,
        submittedAt: sub.submittedAt,
        status: sub.status,
        remarks: sub.remarks
      }))
    );

    // Sort by submission date (newest first)
    history.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Pending Approval List (Postman: GET /api/homework/pending)
 */
export const getPendingHomework = async (req, res) => {
  try {
    const pendingList = await Homework.find({ status: "Pending Approval" })
      .populate("student", "name email")
      .populate("assignedBy", "name email")
      .populate("lecture", "title")
      .lean();
    res.json(pendingList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Approve Homework (Postman: PATCH /api/homework/:submissionId/approve)
 */
export const approveHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { remarks } = req.body;

    const homework = await Homework.findOne({ "submissions._id": submissionId });
    if (!homework) {
      return res.status(404).json({ message: "Homework submission not found" });
    }

    const sub = homework.submissions.id(submissionId);
    if (sub) {
      sub.status = "Approved";
      sub.remarks = remarks || "";
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "Approved";
    await homework.save();

    res.json({ message: "Homework submission approved successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reject Homework (Postman: PATCH /api/homework/:submissionId/reject)
 */
export const rejectHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { remarks } = req.body;

    const homework = await Homework.findOne({ "submissions._id": submissionId });
    if (!homework) {
      return res.status(404).json({ message: "Homework submission not found" });
    }

    const sub = homework.submissions.id(submissionId);
    if (sub) {
      sub.status = "Rejected";
      sub.remarks = remarks || "";
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "Rejected";
    await homework.save();

    res.json({ message: "Homework submission rejected successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
