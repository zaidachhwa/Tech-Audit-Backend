import Homework from "../models/homework.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import mongoose from "mongoose";
import { sendPushToBatch } from "../services/pushNotification.service.js";
import { notifyParents } from "../services/parentNotification.service.js";

// Normalize batch names
const cleanBatchName = (name) => name?.replace(/\s+/g, "").toUpperCase();

/**
 * Assign Homework (POST /api/homework)
 * Supports targeting by Course (Class), Semester (Year), and Batches.
 */
export const createHomework = async (req, res) => {
  try {
    const {
      course,
      semester,
      lectureId,
      subjectId,
      subjectName: rawSubjectName,
      title,
      description,
      comment,
      dueDate,
      batchIds = [],
      attachments = []
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Assignment title is required and cannot be empty." });
    }

    if (!dueDate) {
      return res.status(400).json({ message: "Due date is required." });
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date format." });
    }

    let finalSubjectName = (rawSubjectName || "").trim();
    let finalSubjectId = subjectId || null;

    if (subjectId && !finalSubjectName) {
      try {
        const Subject = (await import("../models/subjectTemplate.model.js")).default || (await import("../models/syllabus.model.js")).default;
        const subjDoc = await Subject.findById(subjectId).lean();
        if (subjDoc) {
          finalSubjectName = subjDoc.subject || subjDoc.name || "";
        }
      } catch (e) {
        // optional subject lookup fallback
      }
    }

    // Filter valid attachment URLs
    const sanitizedAttachments = Array.isArray(attachments)
      ? attachments.filter(a => typeof a === "string" && a.trim().length > 0)
      : [];

    // Get all students enrolled in specified batches or matching course/semester
    let targetStudents = [];
    let batchMap = {}; // studentId -> batchDoc
    let finalBatches = [];

    if (batchIds && batchIds.length > 0) {
      const validBatchObjectIds = batchIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validBatchObjectIds.length > 0) {
        finalBatches = await Batch.find({ _id: { $in: validBatchObjectIds } });
      }
    } else if (course || semester) {
      const q = {};
      if (course) q.course = course;
      if (semester) q.semester = semester;
      finalBatches = await Batch.find(q);
    }

    for (const batch of finalBatches) {
      // Primary: use batch.students array
      if (batch.students && batch.students.length > 0) {
        for (const sid of batch.students) {
          if (sid) {
            targetStudents.push(sid);
            batchMap[sid.toString()] = batch;
          }
        }
      }

      // Secondary: find students by batch_name + batch_no in Student collection
      const studentsInBatch = await Student.find({
        batch_name: batch.batch_name,
        batch_no: batch.batch_no,
      }).select("_id").lean();

      for (const s of studentsInBatch) {
        targetStudents.push(s._id);
        batchMap[s._id.toString()] = batch;
        if (!batch.students.includes(s._id)) {
          batch.students.push(s._id);
        }
      }

      // Tertiary: check StudentBatchMapping
      try {
        const StudentBatchMapping = (await import("../models/studentBatchMapping.model.js")).default;
        const mappings = await StudentBatchMapping.find({ batch: batch._id }).select("student").lean();
        for (const m of mappings) {
          if (m.student) {
            targetStudents.push(m.student);
            batchMap[m.student.toString()] = batch;
          }
        }
      } catch (e) {}

      if (studentsInBatch.length > 0) {
        await batch.save();
      }
    }

    // Fallback: If no batch found but course/semester provided, query students directly
    if (targetStudents.length === 0 && (course || semester)) {
      const studentQuery = {};
      if (course) studentQuery.course = course;
      if (semester) studentQuery.semester = semester;
      const matchedStudents = await Student.find(studentQuery).select("_id batch_name batch_no course semester").lean();
      for (const s of matchedStudents) {
        targetStudents.push(s._id);
        batchMap[s._id.toString()] = {
          _id: null,
          batch_name: s.batch_name || "",
          batch_no: s.batch_no || "",
          course: s.course || course || "",
          semester: s.semester || semester || ""
        };
      }
    }

    // If no students found anywhere, return error
    if (targetStudents.length === 0) {
      return res.status(404).json({ message: "No enrolled students found in the selected batch(es) or class." });
    }

    // Deduplicate student IDs
    const studentIds = [...new Set(targetStudents.map(id => id.toString()))];

    const homeworkPromises = studentIds.map((studentId) => {
      const batchDoc = batchMap[studentId];
      return Homework.create({
        title: title.trim(),
        description: (description || comment || "").trim(),
        comment: (description || comment || "").trim(),
        course: course || batchDoc?.course || "",
        semester: semester || batchDoc?.semester || "",
        subject: finalSubjectId,
        subjectName: finalSubjectName,
        dueDate: parsedDueDate,
        lecture: lectureId || null,
        student: studentId,
        batch: batchDoc?._id || null,
        batchIds: batchIds.length > 0 ? batchIds : (batchDoc?._id ? [batchDoc._id] : []),
        batchName: batchDoc?.batch_name || "",
        batchNumber: batchDoc?.batch_no || "",
        assignedBy: req.user.id,
        status: "assigned",
        attachments: sanitizedAttachments
      });
    });

    await Promise.all(homeworkPromises);

    // Send Push Notification
    const uniqueBatchNames = [...new Set(Object.values(batchMap).map(b => b?.batch_name).filter(Boolean))];
    for (const bName of uniqueBatchNames) {
      await sendPushToBatch(bName, {
        title: "New Homework Assigned",
        body: `You have new homework: ${title.trim()}`,
        url: "/student/assignments"
      });
    }

    if (studentIds.length > 0) {
      await notifyParents(studentIds, "New Homework Assigned", `New homework has been assigned: ${title.trim()}. Due date: ${parsedDueDate.toDateString()}`);
    }

    res.status(201).json({ message: `Homework assigned to ${studentIds.length} students` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Sync helper to backfill any existing schedule lecture homeworks into the Homework collection
 * Throttled to run at most once per 60 seconds to keep read queries instant.
 */
let lastBackfillTime = 0;
const backfillScheduleHomeworks = async () => {
  const now = Date.now();
  if (now - lastBackfillTime < 60000) return;
  lastBackfillTime = now;

  try {
    const { Schedule } = await import("../models/schedule.model.js");
    const { syncScheduleLectureToHomework } = await import("./schedule.controller.js");
    const schedulesWithHW = await Schedule.find({ "lectures.homework.title": { $exists: true, $ne: "" } })
      .populate("batch")
      .populate("batches")
      .populate("teacher")
      .lean();

    for (const sch of schedulesWithHW) {
      for (const lec of sch.lectures || []) {
        if (lec.homework && lec.homework.title && lec.homework.title.trim()) {
          await syncScheduleLectureToHomework(sch, lec, sch.teacher?._id || sch.teacher);
        }
      }
    }
  } catch (syncErr) {
    console.error("Backfill sync error in homework controller:", syncErr);
  }
};

/**
 * Get Homework List (GET /api/homework)
 * Supports query filters: course, semester, batch, status
 */
export const getHomework = async (req, res) => {
  try {
    // Run backfill sync to ensure lecture scheduler assignments are included
    await backfillScheduleHomeworks();

    const filter = {};
    const { course, semester, batch, status } = req.query;

    if (req.user && req.user.role === "teacher") {
      filter.assignedBy = req.user.id;
    }
    if (course) filter.course = course;
    if (semester) filter.semester = semester;
    if (batch) filter.batch = batch;
    if (status) filter.status = status;

    const homeworkList = await Homework.find(filter)
      .sort({ createdAt: -1 })
      .populate("student", "name email rollNo enrollmentNo course semester batch_name batch_no")
      .populate("assignedBy", "name email")
      .populate("batch", "batch_name batch_no course semester")
      .populate({
        path: "lecture",
        select: "title syllabus",
        populate: { path: "syllabus", select: "subject" }
      })
      .lean();

    res.json(homeworkList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Homework Details (GET /api/homework/:id)
 */
export const getHomeworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id)
      .populate("student", "name email rollNo enrollmentNo course semester batch_name batch_no")
      .populate("assignedBy", "name email")
      .populate("batch", "batch_name batch_no course semester")
      .populate("lecture", "title");

    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    if (req.user && req.user.role === "teacher" && homework.assignedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only view homework assigned by you." });
    }

    res.json(homework);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update Homework (PUT /api/homework/:id)
 */
export const updateHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    if (req.user && req.user.role === "teacher" && homework.assignedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only update homework assigned by you." });
    }

    const updated = await Homework.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    res.json({ message: "Homework updated successfully", homework: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Homework (DELETE /api/homework/:id)
 */
export const deleteHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) {
      return res.status(404).json({ message: "Homework not found" });
    }

    if (req.user && req.user.role === "teacher" && homework.assignedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only delete homework assigned by you." });
    }

    await Homework.findByIdAndDelete(id);
    res.json({ message: "Homework deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Assigned Homework for Student (GET /api/student-homework or GET /api/student/homework)
 */
export const getMyHomework = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Run backfill sync so student sees assignments created from lecture scheduler
    await backfillScheduleHomeworks();

    const homeworkList = await Homework.find({
      student: studentId
    })
      .populate("assignedBy", "name email")
      .populate("batch", "batch_name batch_no course semester")
      .populate({
        path: "lecture",
        select: "title",
        populate: { path: "syllabus", select: "subject" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(homeworkList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submit Homework (POST /api/student-homework or POST /api/student/homework/:homeworkId/submit)
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
    const validAttachments = Array.isArray(finalAttachments)
      ? finalAttachments.filter(a => typeof a === "string" && a.trim().length > 0)
      : [];

    if (!submissionText?.trim() && validAttachments.length === 0) {
      return res.status(400).json({ message: "Please provide explanatory notes or attach solution files." });
    }

    // Push new submission to submissions list
    homework.submissions.push({
      submissionText: (submissionText || "").trim(),
      fileName: validAttachments.length > 0 ? validAttachments[0].split("/").pop() : "attachment",
      fileUrl: validAttachments.length > 0 ? validAttachments[0] : "",
      attachments: validAttachments,
      submittedAt: new Date(),
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
        sub.attachments = attachments;
      } else if (attachment) {
        sub.fileUrl = attachment;
        sub.fileName = attachment.split("/").pop();
        sub.attachments = [attachment];
      }
      await homework.save();
    }

    res.json({ message: "Submission updated successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Submission History (GET /api/student/homework/history)
 */
export const getStudentHomeworkHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const homeworkList = await Homework.find({ student: studentId })
      .populate("lecture", "title")
      .populate("batch", "batch_name batch_no")
      .select("title submissions lecture batch course semester subjectName marks outOf remarks status");

    const history = homeworkList.flatMap((hw) =>
      hw.submissions.map((sub) => ({
        homeworkId: hw._id,
        homeworkTitle: hw.title,
        subjectName: hw.subjectName || "",
        course: hw.course || "",
        semester: hw.semester || "",
        lectureTitle: hw.lecture?.title || "Unknown Lecture",
        submissionId: sub._id,
        submissionText: sub.submissionText,
        fileUrl: sub.fileUrl,
        attachments: sub.attachments || (sub.fileUrl ? [sub.fileUrl] : []),
        submittedAt: sub.submittedAt,
        status: sub.status,
        marks: sub.marks !== undefined ? sub.marks : hw.marks,
        outOf: sub.outOf !== undefined ? sub.outOf : hw.outOf,
        remarks: sub.remarks || hw.remarks || ""
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
 * Pending Approval List (GET /api/homework/pending)
 */
export const getPendingHomework = async (req, res) => {
  try {
    const filter = { status: "pending_review" };
    const { course, semester, batch } = req.query;

    if (req.user && req.user.role === "teacher") {
      filter.assignedBy = req.user.id;
    }
    if (course) filter.course = course;
    if (semester) filter.semester = semester;
    if (batch) filter.batch = batch;

    const pendingList = await Homework.find(filter)
      .populate("student", "name email rollNo enrollmentNo course semester batch_name batch_no")
      .populate("assignedBy", "name email")
      .populate("batch", "batch_name batch_no course semester")
      .populate({
        path: "lecture",
        select: "title syllabus",
        populate: { path: "syllabus", select: "subject" }
      })
      .lean();

    res.json(pendingList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Approve Homework (PATCH /api/homework/:submissionId/approve)
 * Strictly validates: marks <= outOf, outOf > 0, marks >= 0
 */
export const approveHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { remarks, marks, outOf } = req.body;

    const homework = await Homework.findOne({ "submissions._id": submissionId });
    if (!homework) {
      return res.status(404).json({ message: "Homework submission not found" });
    }

    if (req.user && req.user.role === "teacher" && homework.assignedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only approve submissions for homework assigned by you." });
    }

    // --- STRICT MARKS VALIDATION ---
    if (marks === undefined || marks === null || marks === "" || outOf === undefined || outOf === null || outOf === "") {
      return res.status(400).json({ message: "Both obtained marks and total marks (out of) are required for grading." });
    }

    const numMarks = Number(marks);
    const numOutOf = Number(outOf);

    if (isNaN(numMarks) || isNaN(numOutOf)) {
      return res.status(400).json({ message: "Marks and Total Marks must be valid numbers." });
    }

    if (numOutOf <= 0) {
      return res.status(400).json({ message: "Total marks (out of) must be greater than zero." });
    }

    if (numMarks < 0) {
      return res.status(400).json({ message: "Obtained marks cannot be negative." });
    }

    if (numMarks > numOutOf) {
      return res.status(400).json({
        message: `Invalid score: Obtained marks (${numMarks}) cannot exceed Total marks (${numOutOf}).`
      });
    }

    const sub = homework.submissions.id(submissionId);
    if (sub) {
      sub.status = "approved";
      sub.remarks = (remarks || "").trim();
      sub.marks = numMarks;
      sub.outOf = numOutOf;
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "approved";
    homework.marks = numMarks;
    homework.outOf = numOutOf;
    homework.remarks = (remarks || "").trim();
    await homework.save();

    // Also sync status in Submission collection if this is tied to a schedule lecture
    try {
      const { Submission } = await import("../models/submission.model.js");
      if (homework.lecture) {
        await Submission.updateMany(
          { lectureId: homework.lecture, student: homework.student },
          { $set: { status: "reviewed", marks: numMarks, remarks: (remarks || "").trim() } }
        );
      }
    } catch (e) {}

    res.json({ message: "Homework submission approved successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Reject Homework (PATCH /api/homework/:submissionId/reject)
 * Requires teacher feedback remarks so student knows what needs revision.
 */
export const rejectHomework = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { remarks } = req.body;

    const homework = await Homework.findOne({ "submissions._id": submissionId });
    if (!homework) {
      return res.status(404).json({ message: "Homework submission not found" });
    }

    if (req.user && req.user.role === "teacher" && homework.assignedBy?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied. You can only reject submissions for homework assigned by you." });
    }

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({
        message: "Please provide feedback remarks explaining the reason for rejection to the student."
      });
    }

    const sub = homework.submissions.id(submissionId);
    if (sub) {
      sub.status = "rejected";
      sub.remarks = remarks.trim();
      sub.reviewedBy = req.user.id;
      sub.reviewedAt = new Date();
    }

    homework.status = "rejected";
    homework.remarks = remarks.trim();
    await homework.save();

    // Also sync status in Submission collection if this is tied to a schedule lecture
    try {
      const { Submission } = await import("../models/submission.model.js");
      if (homework.lecture) {
        await Submission.updateMany(
          { lectureId: homework.lecture, student: homework.student },
          { $set: { status: "rejected", remarks: remarks.trim() } }
        );
      }
    } catch (e) {}

    res.json({ message: "Homework submission rejected successfully", homework });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
