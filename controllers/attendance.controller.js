import { Attendance } from "../models/attendance.model.js";

/* =====================================
   MARK / UPDATE ATTENDANCE
   POST /attendance/mark
   Body: { batchId, date, records: [{ student, status }] }
===================================== */
export const markAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId, date, records, lectureId, attendance } = req.body;

    const finalBatchId = batchId;
    if (!finalBatchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    const finalDate = date ? new Date(date) : new Date();
    finalDate.setHours(0, 0, 0, 0);

    let finalRecords = [];
    if (records && Array.isArray(records)) {
      finalRecords = records;
    } else if (attendance && Array.isArray(attendance)) {
      finalRecords = attendance.map((rec) => ({
        student: rec.studentId,
        status: rec.status.charAt(0).toUpperCase() + rec.status.slice(1).toLowerCase()
      }));
    }

    const updateFields = {
      batch: finalBatchId,
      date: finalDate,
      teacher: teacherId,
      records: finalRecords
    };

    if (lectureId) {
      updateFields.lecture = lectureId;
    }

    // Upsert — update if exists for this batch+date+teacher, create otherwise
    const attendanceDoc = await Attendance.findOneAndUpdate(
      { batch: finalBatchId, date: finalDate, teacher: teacherId },
      updateFields,
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance saved successfully", attendance: attendanceDoc });
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

/* =====================================
   GET ATTENDANCE FOR A BATCH + MONTH (Redesigned)
   GET /attendance/:batchId?year=...&month=...
===================================== */
export const getAttendanceForMonth = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.params;
    const { year, month } = req.query; // month is 1-indexed (1-12)

    if (!batchId || !year || !month) {
      return res.status(400).json({ message: "batchId, year, and month are required" });
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1; // 0-indexed for Date

    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      batch: batchId,
      teacher: teacherId,
      date: { $gte: start, $lte: end },
    }).populate("records.student", "name email");

    res.json({ records });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   SAVE BULK ATTENDANCE (Redesigned)
   POST /attendance/bulk
   Body: { batchId, records: [{ student, date, status }] }
===================================== */
export const saveBulkAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId, records } = req.body;

    if (!batchId || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: "batchId and records are required" });
    }

    // Group records by date (YYYY-MM-DD)
    const recordsByDate = {};
    records.forEach((r) => {
      const dStr = r.date;
      if (!recordsByDate[dStr]) {
        recordsByDate[dStr] = [];
      }
      recordsByDate[dStr].push({ student: r.student, status: r.status });
    });

    // Upsert each date's records
    for (const [dStr, recs] of Object.entries(recordsByDate)) {
      const normalizedDate = new Date(dStr);
      normalizedDate.setHours(0, 0, 0, 0);

      await Attendance.findOneAndUpdate(
        { batch: batchId, date: normalizedDate, teacher: teacherId },
        { batch: batchId, date: normalizedDate, teacher: teacherId, records: recs },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Bulk attendance saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};