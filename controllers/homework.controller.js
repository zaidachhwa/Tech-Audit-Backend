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
      subjectId,
      title,
      description,
      comment, // alias
      dueDate,
      batchIds = [],
      attachments = []
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: "Title and dueDate are required" });
    }

    // Get all students enrolled in specified batches
    let targetStudents = [];
    let batchMap = {}; // studentId -> batchDoc
    if (batchIds && batchIds.length > 0) {
      const batches = await Batch.find({ _id: { $in: batchIds } });
      for (const batch of batches) {
        // Primary: use batch.students array
        if (batch.students && batch.students.length > 0) {
          for (const sid of batch.students) {
            targetStudents.push(sid);
            batchMap[sid.toString()] = batch;
          }
        } else {
          // Fallback: find students by batch_name + batch_no in Student collection
          const studentsInBatch = await Student.find({
            batch_name: batch.batch_name,
            batch_no: batch.batch_no,
          }).select("_id").lean();
          for (const s of studentsInBatch) {
            targetStudents.push(s._id);
            batchMap[s._id.toString()] = batch;
            // Also update batch.students for future lookups
            if (!batch.students.includes(s._id)) {
              batch.students.push(s._id);
            }
          }
          if (studentsInBatch.length > 0) {
            await batch.save();
          }
        }
      }
    }

    // If no students found anywhere, return error
    if (targetStudents.length === 0) {
      return res.status(404).json({ message: "No students found in the specified batches" });
    }


    // Deduplicate student IDs
    const studentIds = [...new Set(targetStudents.map(id => id.toString()))];

    const homeworkPromises = studentIds.map((studentId) => {
      const batchDoc = batchMap[studentId];
      return Homework.create({
        title,
        description: description || comment || "",
        comment: description || comment || "",
        dueDate,
        lecture: lectureId || null,
        student: studentId,
        batch: batchDoc?._id || null,
        batchName: batchDoc?.batch_name || "",
        batchNumber: batchDoc?.batch_no || "",
        assignedBy: req.user.id,
        status: "assigned",
        attachments: attachments || []
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
      .sort({ createdAt: -1 })
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
 * Get Assigned Homework (GET /api/student-homework)
 * Finds all students in the same batch (by batch_name + batch_no from Student collection)
 * and returns all homework assigned to any of them — matching exactly what Dashboard shows.
 */
export const getMyHomework = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Get this student's batch_name + batch_no
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 2. Find ALL students with same batch_name + batch_no from Student collection
    //    (more reliable than Batch.students array which may be out of sync)
    const batchMates = await Student.find({
      batch_name: student.batch_name,
      batch_no: student.batch_no,
    }).select("_id").lean();

    const batchStudentIds = batchMates.map((s) => s._id);
    // Ensure current student is always included
    if (!batchStudentIds.some((id) => id.toString() === studentId.toString())) {
      batchStudentIds.push(studentId);
    }

    // 3. Find homework for ANY student in this batch (same as dashboard)
    const homeworkList = await Homework.find({
      student: { $in: batchStudentIds },
    })
      .populate("assignedBy", "name email")
      .populate({
        path: "lecture",
        select: "title",
        populate: { path: "syllabus", select: "subject" },
      })
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
    const homeworkId = req.body.homeworkId || req.params.homeworkId;
    const { submissionText, attachment, attachments } = req.body;
    const studentId = req.user.id;

    if (!homeworkId) {
      return res.status(400).json({ message: "homeworkId is required" });
    }

    const homework = await Homework.findOne({ _id: homeworkId, student: studentId });
    if (!homework) {
      return res.status(404).json({ message: "Homework not found or unauthorized" });
    }

    const finalAttachments = attachments || (attachment ? [attachment] : []);

    // Push new submission to submissions list
    homework.submissions.push({
      submissionText: submissionText || "",
      fileName: finalAttachments.length > 0 ? finalAttachments[0].split("/").pop() : "attachment",
      fileUrl: finalAttachments.length > 0 ? finalAttachments[0] : "",
      status: "pending_review"
    });

    homework.status = "pending_review";
    await homework.save();

    res.json({ message: "Homework submitted successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { submissionText, attachments, attachment } = req.body;

    const homework = await Homework.findOne({ "submissions._id": id });
    if (!homework) {
      return res.status(404).json({ message: "Homework submission not found" });
    }

    const sub = homework.submissions.id(id);
    if (sub) {
      if (submissionText !== undefined) sub.submissionText = submissionText;
      if (attachments && Array.isArray(attachments)) {
        sub.fileUrl = attachments[0] || "";
        sub.fileName = attachments[0] ? attachments[0].split("/").pop() : "attachment";
      } else if (attachment) {
        sub.fileUrl = attachment;
        sub.fileName = attachment.split("/").pop();
      }
      await homework.save();
    }

    res.json({ message: "Submission updated successfully", homework });
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
    const pendingList = await Homework.find({ status: "pending_review" })
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
      sub.status = "approved";
      sub.remarks = remarks || "";
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "approved";
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
      sub.status = "rejected";
      sub.remarks = remarks || "";
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "rejected";
    await homework.save();

    res.json({ message: "Homework submission rejected successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
