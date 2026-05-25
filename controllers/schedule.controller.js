import { Schedule } from "../models/schedule.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import Batch from "../models/batch.model.js";
import { Submission } from "../models/submission.model.js";

/**
 * Create a new Lecture Schedule
 * Role: Admin
 */
export const createSchedule = async (req, res) => {
  try {
    const { subject, batch, teacher, lectures } = req.body;

    if (!subject || !batch || !teacher) {
      return res.status(400).json({ message: "Subject, batch ID, and teacher ID are required." });
    }

    // Verify batch exists
    const batchExists = await Batch.findById(batch);
    if (!batchExists) {
      return res.status(404).json({ message: "Target Batch not found." });
    }

    const newSchedule = await Schedule.create({
      subject,
      batch,
      teacher,
      lectures: lectures || []
    });

    const populated = await Schedule.findById(newSchedule._id)
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email");

    return res.status(201).json({
      message: "Lecture schedule generated successfully",
      schedule: populated
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * List Lecture Schedules based on user role
 * Role: Admin, Teacher, Student
 */
export const listSchedules = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query = {};

    if (role === "teacher") {
      // Teachers see schedules where they are primary teacher OR assigned to any lecture
      query.$or = [
        { teacher: userId },
        { "lectures.teacher": userId }
      ];
    } else if (role === "student") {
      // Students only see schedules matching their enrolled Batch
      const student = await Student.findById(userId).lean();
      if (!student) {
        return res.status(404).json({ message: "Student account not found." });
      }

      // Resolve student's Batch ObjectId
      const studentBatch = await Batch.findOne({
        batch_name: student.batch_name,
        batch_no: student.batch_no
      }).lean();

      if (!studentBatch) {
        return res.status(200).json([]); // No matching batch found in system yet
      }

      query.batch = studentBatch._id;
    }

    const schedules = await Schedule.find(query)
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(schedules);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get detailed Schedule by ID
 * Role: Admin, Teacher, Student
 */
export const getScheduleById = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const schedule = await Schedule.findById(req.params.id)
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Role-based visibility validation
    if (role === "teacher") {
      const isPrimary = schedule.teacher._id.toString() === userId;
      const isLectureTeacher = schedule.lectures.some(l => l.teacher && l.teacher._id.toString() === userId);
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. This schedule is assigned to another teacher." });
      }
    }

    if (role === "student") {
      const student = await Student.findById(userId).lean();
      if (!student) {
        return res.status(404).json({ message: "Student account not found." });
      }

      const studentBatch = await Batch.findOne({
        batch_name: student.batch_name,
        batch_no: student.batch_no
      }).lean();

      if (!studentBatch || schedule.batch._id.toString() !== studentBatch._id.toString()) {
        return res.status(403).json({ message: "Access denied. This schedule is for another batch." });
      }
    }

    return res.status(200).json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update an existing Lecture Schedule
 * Role: Admin (full edit), Teacher (only status/lecture details within assigned schedules)
 */
export const updateSchedule = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { subject, batch, teacher, lectures } = req.body;

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (role === "student") {
      return res.status(403).json({ message: "Forbidden: Students cannot edit schedules." });
    }

    if (role === "teacher") {
      // Validate that this is the assigned teacher (primary or lecture-level)
      const isPrimary = schedule.teacher.toString() === userId;
      const isLectureTeacher = schedule.lectures.some(l => l.teacher && l.teacher.toString() === userId);
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only edit your own schedules." });
      }

      // Restrict teachers from changing parent schedule metadata (subject, batch, teacher)
      if (subject && subject !== schedule.subject) {
        return res.status(403).json({ message: "Forbidden: Teachers cannot change the subject title." });
      }
      if (batch && batch !== schedule.batch.toString()) {
        return res.status(403).json({ message: "Forbidden: Teachers cannot change the batch." });
      }
      if (teacher && teacher !== schedule.teacher.toString()) {
        return res.status(403).json({ message: "Forbidden: Teachers cannot change the assigned teacher." });
      }
    }

    // Apply updates
    if (role === "admin") {
      if (subject) schedule.subject = subject;
      if (batch) schedule.batch = batch;
      if (teacher) schedule.teacher = teacher;
    }

    if (lectures) {
      schedule.lectures = lectures;
    }

    await schedule.save();

    const populated = await Schedule.findById(schedule._id)
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email");

    return res.status(200).json({
      message: "Schedule updated successfully",
      schedule: populated
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete a Lecture Schedule
 * Role: Admin
 */
export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    await Schedule.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Save Homework details on a specific lecture row
 * Role: Admin, Teacher
 */
export const saveHomework = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { title, description, due_date, accept_submissions } = req.body;
    const { id: userId, role } = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found inside this schedule" });
    }

    if (role === "teacher") {
      const isPrimary = schedule.teacher.toString() === userId;
      const isLectureTeacher = lecture.teacher && lecture.teacher.toString() === userId;
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only assign homework to your own lectures." });
      }
    }

    lecture.homework = {
      title: title || "",
      description: description || "",
      due_date: due_date ? new Date(due_date) : undefined,
      accept_submissions: typeof accept_submissions !== "undefined" ? accept_submissions : true
    };

    await schedule.save();

    return res.status(200).json({
      message: "Homework assigned successfully",
      lecture
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Generic upload notes logic for unsaved schedules (or templates)
 */
export const uploadNotesGeneric = async (req, res) => {
  try {
    const files = req.files || {};
    const response = {};

    if (files.notes_shared && files.notes_shared[0]) {
      const file = files.notes_shared[0];
      response.notes_shared = {
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      };
    }
    
    if (files.notes_teacher && files.notes_teacher[0]) {
      const file = files.notes_teacher[0];
      response.notes_teacher = {
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      };
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Upload notes to a specific lecture
 * Roles: Admin, Teacher
 */
export const saveNotes = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { id: userId, role } = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found inside this schedule" });
    }

    if (role === "teacher") {
      const isPrimary = schedule.teacher.toString() === userId;
      const isLectureTeacher = lecture.teacher && lecture.teacher.toString() === userId;
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only upload notes to your own lectures." });
      }
    }

    const files = req.files || {};
    
    // Process notes_shared
    if (files.notes_shared && files.notes_shared.length > 0) {
      const file = files.notes_shared[0];
      lecture.notes_shared = {
        fileName: file.originalname,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
      };
    }

    // Process notes_teacher
    if (files.notes_teacher && files.notes_teacher.length > 0) {
      const file = files.notes_teacher[0];
      lecture.notes_teacher = {
        fileName: file.originalname,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
      };
    }

    await schedule.save();

    return res.status(200).json({
      message: "Notes uploaded successfully",
      lecture
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get submissions for a specific lecture row
 * Role: Admin, Teacher, Student
 */
export const getLectureSubmissions = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { id: userId, role } = req.user;

    let query = {
      schedule: scheduleId,
      lectureId: lectureId
    };

    if (role === "student") {
      // Students can only see their own submissions
      query.student = userId;
    }

    const submissions = await Submission.find(query)
      .populate("student", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(submissions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Submit Homework (Student only)
 * Role: Student
 */
export const submitHomework = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { fileName, fileUrl } = req.body;
    const { id: userId, role } = req.user;

    if (role !== "student") {
      return res.status(403).json({ message: "Only students can submit homework." });
    }

    if (!fileName || !fileUrl) {
      return res.status(400).json({ message: "File name and file content are required." });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    // Verify homework is defined and accepting submissions
    if (!lecture.homework || !lecture.homework.title) {
      return res.status(400).json({ message: "No homework is currently assigned to this lecture." });
    }

    if (lecture.homework.accept_submissions === false) {
      return res.status(400).json({ message: "Submissions for this assignment are closed." });
    }

    // Check if a submission already exists (resubmission support)
    let submission = await Submission.findOne({
      schedule: scheduleId,
      lectureId: lectureId,
      student: userId
    });

    if (submission) {
      submission.fileName = fileName;
      submission.fileUrl = fileUrl;
      submission.status = "pending"; // Reset status on resubmission
      await submission.save();
    } else {
      submission = await Submission.create({
        schedule: scheduleId,
        lectureId: lectureId,
        student: userId,
        fileName,
        fileUrl
      });
    }

    const populated = await Submission.findById(submission._id).populate("student", "name email");

    return res.status(200).json({
      message: "Homework submitted successfully!",
      submission: populated
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Review a homework submission (Admin/Teacher only)
 * Role: Admin, Teacher
 */
export const reviewSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { id: userId, role } = req.user;

    const submission = await Submission.findById(submissionId).populate("schedule");
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Validate that Teacher is assigned to the schedule
    if (role === "teacher" && submission.schedule.teacher.toString() !== userId) {
      return res.status(403).json({ message: "Access denied. You can only review submissions for your own schedules." });
    }

    // Toggle status
    submission.status = submission.status === "reviewed" ? "pending" : "reviewed";
    await submission.save();

    const populated = await Submission.findById(submission._id).populate("student", "name email");

    return res.status(200).json({
      message: `Submission marked as ${populated.status}`,
      submission: populated
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get all Homework Submissions for a Schedule
 * Role: Admin, Teacher
 */
export const getScheduleSubmissions = async (req, res) => {
  try {
    const { id: scheduleId } = req.params;
    const { id: userId, role } = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Role-based security validation
    if (role === "teacher") {
      const isPrimary = schedule.teacher.toString() === userId;
      const isLectureTeacher = schedule.lectures.some(l => l.teacher && l.teacher.toString() === userId);
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only view submissions for your own schedules." });
      }
    }

    const submissions = await Submission.find({ schedule: scheduleId })
      .populate("student", "name email")
      .lean();

    return res.status(200).json(submissions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete a homework submission (Student only)
 * Role: Student
 */
export const deleteSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { id: userId, role } = req.user;

    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Only the student who submitted it can delete it
    if (role === "student" && submission.student.toString() !== userId) {
      return res.status(403).json({ message: "Access denied. You can only delete your own submissions." });
    }

    // Optional: Can also prevent deletion if already reviewed
    if (submission.status === "reviewed") {
      return res.status(400).json({ message: "Cannot delete a reviewed submission." });
    }

    await Submission.findByIdAndDelete(submissionId);

    return res.status(200).json({ message: "Submission deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete notes from a specific lecture
 * Roles: Admin, Teacher
 */
export const deleteNotes = async (req, res) => {
  try {
    const { scheduleId, lectureId, type } = req.params;
    const { id: userId, role } = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found inside this schedule" });
    }

    if (role === "teacher") {
      const isPrimary = schedule.teacher.toString() === userId;
      const isLectureTeacher = lecture.teacher && lecture.teacher.toString() === userId;
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only delete notes from your own lectures." });
      }
    }

    if (type === "shared") {
      lecture.notes_shared = undefined;
    } else if (type === "teacher") {
      lecture.notes_teacher = undefined;
    } else {
      return res.status(400).json({ message: "Invalid note type" });
    }

    await schedule.save();

    return res.status(200).json({
      message: "Notes deleted successfully",
      lecture
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
