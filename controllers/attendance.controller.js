import { Attendance } from "../models/attendance.model.js";

/* =====================================
   MARK / UPDATE ATTENDANCE
   POST /attendance/mark
   Body: { batchId, date, records: [{ student, status }] }
===================================== */
export const markAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId, date, records } = req.body;

    if (!batchId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "batchId, date and records are required" });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Upsert — update if exists for this batch+date+teacher, create otherwise
    const attendance = await Attendance.findOneAndUpdate(
      { batch: batchId, date: normalizedDate, teacher: teacherId },
      { batch: batchId, date: normalizedDate, teacher: teacherId, records },
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance saved successfully", attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   GET ATTENDANCE FOR A BATCH + DATE
   GET /attendance?batchId=&date=
===================================== */
export const getAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId, date } = req.query;

    if (!batchId || !date) {
      return res.status(400).json({ message: "batchId and date are required" });
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      batch: batchId,
      date: normalizedDate,
      teacher: teacherId,
    }).populate("records.student", "name email");

    res.json({ attendance: attendance || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   GET ATTENDANCE SUMMARY FOR A BATCH
   GET /attendance/summary?batchId=
===================================== */
export const getAttendanceSummary = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    const records = await Attendance.find({
      batch: batchId,
      teacher: teacherId,
    }).sort({ date: -1 });

    res.json({ summary: records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};