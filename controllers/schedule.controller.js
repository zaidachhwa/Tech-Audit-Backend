import { Schedule } from "../models/schedule.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";

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
      .populate("teacher", "name email");

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
      // Teachers only see their assigned schedules
      query.teacher = userId;
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
      .populate("teacher", "name email");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Role-based visibility validation
    if (role === "teacher" && schedule.teacher._id.toString() !== userId) {
      return res.status(403).json({ message: "Access denied. This schedule is assigned to another teacher." });
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
      // Validate that this is the assigned teacher
      if (schedule.teacher.toString() !== userId) {
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
      .populate("teacher", "name email");

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
