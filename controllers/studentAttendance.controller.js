import { StudentAttendance } from "../models/studentAttendance.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";

/* ─── HELPERS ────────────────────────────────────────────────────────────── */

/**
 * Parse a time_slot string into { startHour, startMin, endHour, endMin }
 * Supports formats: "9:00 - 11:00", "9:00-11:00", "09:00 AM - 11:00 AM", "9:00"
 */
function parseTimeSlot(timeSlot) {
  if (!timeSlot) return null;

  // Normalise — remove extra spaces around dashes
  const cleaned = timeSlot.replace(/\s*[-–—to]+\s*/gi, " - ").trim();

  // Try range: "HH:MM - HH:MM" (with optional AM/PM)
  const rangeMatch = cleaned.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  );

  if (rangeMatch) {
    let [, sh, sm, sap, eh, em, eap] = rangeMatch;
    let startH = parseInt(sh), startM = parseInt(sm);
    let endH = parseInt(eh), endM = parseInt(em);

    if (sap) {
      if (sap.toUpperCase() === "PM" && startH !== 12) startH += 12;
      if (sap.toUpperCase() === "AM" && startH === 12) startH = 0;
    }
    if (eap) {
      if (eap.toUpperCase() === "PM" && endH !== 12) endH += 12;
      if (eap.toUpperCase() === "AM" && endH === 12) endH = 0;
    }

    return { startHour: startH, startMin: startM, endHour: endH, endMin: endM };
  }

  // Single time: "HH:MM" (with optional AM/PM) — assume 1-hour duration
  const singleMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (singleMatch) {
    let [, h, m, ap] = singleMatch;
    let hour = parseInt(h), min = parseInt(m);
    if (ap) {
      if (ap.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (ap.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    return { startHour: hour, startMin: min, endHour: hour + 1, endMin: min };
  }

  return null;
}

/**
 * Given a student's punch-in/out times and a lecture's date + time_slot,
 * determine if the student was "Present" or "Absent" for that lecture.
 */
function getLectureStatus(punchInTime, punchOutTime, lectureDate, timeSlot) {
  if (!punchInTime) return "Absent";

  const parsed = parseTimeSlot(timeSlot);
  if (!parsed) return "Present"; // If we can't parse the slot, default present if punched in

  const { startHour, startMin, endHour, endMin } = parsed;

  // Build absolute Date objects for lecture start & end on the given date
  const d = new Date(lectureDate);
  const lectureStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMin, 0);
  const lectureEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), endHour, endMin, 0);

  // Student must be punched in before or at lecture start
  const punchIn = new Date(punchInTime);
  if (punchIn > lectureStart) return "Absent";

  // If student hasn't punched out yet, they are considered present (still in)
  if (!punchOutTime) return "Present";

  // Student must punch out at or after lecture end
  const punchOut = new Date(punchOutTime);
  if (punchOut < lectureEnd) return "Absent";

  return "Present";
}

/**
 * Recalculate lecture attendance for a given student attendance record.
 * Fetches all scheduled lectures for the student's batch on the date,
 * then evaluates each against the punch times.
 */
async function recalcLectureAttendance(attendanceDoc) {
  const { batch, date, punchInTime, punchOutTime } = attendanceDoc;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const lectureList = [];

  // 1. From Schedule model (lectures array)
  const schedules = await Schedule.find({
    batch,
    "lectures.date": { $gte: dayStart, $lte: dayEnd },
  }).lean();

  schedules.forEach((sch) => {
    (sch.lectures || []).forEach((lec) => {
      const lecDate = new Date(lec.date);
      if (lecDate >= dayStart && lecDate <= dayEnd) {
        lectureList.push({
          scheduleId: sch._id,
          lectureId: String(lec._id),
          batchLectureId: null,
          lectureTitle: lec.title || "Untitled",
          subject: sch.subject || "",
          timeSlot: lec.time_slot || "",
          lecDate,
        });
      }
    });
  });

  // 2. From BatchLecture model
  const batchLectures = await BatchLecture.find({
    batch,
    dueDate: { $gte: dayStart, $lte: dayEnd },
  })
    .populate("syllabus", "subject name")
    .populate("templateLecture", "title")
    .lean();

  batchLectures.forEach((bl) => {
    // Avoid duplicates — skip if we already have a schedule lecture with same title for same batch
    const isDup = lectureList.some(
      (l) => l.lectureTitle === bl.title && String(l.scheduleId)
    );
    if (!isDup) {
      lectureList.push({
        scheduleId: null,
        lectureId: String(bl._id),
        batchLectureId: bl._id,
        lectureTitle: bl.title || bl.templateLecture?.title || "Untitled",
        subject: bl.syllabus?.subject || bl.syllabus?.name || "",
        timeSlot: bl.remarks || "",
        lecDate: new Date(bl.dueDate),
      });
    }
  });

  // 3. Evaluate each lecture
  attendanceDoc.lectureAttendance = lectureList.map((lec) => ({
    scheduleId: lec.scheduleId,
    lectureId: lec.lectureId,
    batchLectureId: lec.batchLectureId,
    lectureTitle: lec.lectureTitle,
    subject: lec.subject,
    timeSlot: lec.timeSlot,
    status: getLectureStatus(punchInTime, punchOutTime, lec.lecDate, lec.timeSlot),
  }));

  return attendanceDoc;
}

import Settings from "../models/settings.model.js";

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (val) => (val * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Verify student's location against institute geofence
 */
async function verifyGeofence(studentLat, studentLng) {
  if (!studentLat || !studentLng) {
    return { ok: false, error: "Location coordinates are required." };
  }

  const setting = await Settings.findOne({ key: "geofence" });
  if (!setting || !setting.value || !setting.value.lat || !setting.value.lng || !setting.value.radius) {
    // If not configured by admin, bypass
    return { ok: true };
  }

  const { lat: instLat, lng: instLng, radius } = setting.value;
  const distance = getDistanceInMeters(studentLat, studentLng, instLat, instLng);

  if (distance > radius) {
    return { ok: false, error: `You are too far from the institute. Distance: ${Math.round(distance)}m, Allowed: ${radius}m.` };
  }
  return { ok: true };
}

/**
 * Find student's batch ObjectId
 */
async function findStudentBatch(studentId) {
  const student = await Student.findById(studentId).lean();
  if (!student) return null;

  let batch = await Batch.findOne({ students: studentId });
  if (!batch && student.batch_name) {
    batch = await Batch.findOne({
      batch_name: student.batch_name,
      batch_no: student.batch_no,
    });
    // Auto-link
    if (batch && !batch.students.includes(studentId)) {
      batch.students.push(studentId);
      await batch.save();
    }
  }
  return batch;
}

/* ─── STUDENT: PUNCH IN ──────────────────────────────────────────────── */

export const studentPunchIn = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { lat, lng } = req.body;

    const geoCheck = await verifyGeofence(lat, lng);
    if (!geoCheck.ok) {
      return res.status(403).json({ message: geoCheck.error });
    }

    if (!req.file) {
      return res.status(400).json({ message: "A photo selfie is required to punch in." });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const batch = await findStudentBatch(studentId);
    if (!batch) {
      return res.status(400).json({ message: "You are not assigned to any batch." });
    }

    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Check if already punched in today
    const existing = await StudentAttendance.findOne({ student: studentId, date: dateKey });
    if (existing && existing.status !== "NOT_PUNCHED") {
      return res.status(400).json({
        message: existing.status === "PUNCHED_IN"
          ? "You have already punched in today."
          : "You have already punched in and out today.",
      });
    }

    const now = new Date();

    if (existing) {
      existing.punchInTime = now;
      existing.status = "PUNCHED_IN";
      existing.punchInPhoto = photoUrl;
      existing.punchInLocation = { lat, lng };
      await existing.save();
      return res.json({ message: "Punched In successfully!", record: existing });
    }

    const record = await StudentAttendance.create({
      student: studentId,
      batch: batch._id,
      date: dateKey,
      punchInTime: now,
      status: "PUNCHED_IN",
      punchInPhoto: photoUrl,
      punchInLocation: { lat, lng },
    });

    return res.json({ message: "Punched In successfully!", record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "You have already punched in today." });
    }
    return res.status(500).json({ message: err.message });
  }
};

/* ─── STUDENT: PUNCH OUT ─────────────────────────────────────────────── */

export const studentPunchOut = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { lat, lng } = req.body;

    const geoCheck = await verifyGeofence(lat, lng);
    if (!geoCheck.ok) {
      return res.status(403).json({ message: geoCheck.error });
    }

    if (!req.file) {
      return res.status(400).json({ message: "A photo selfie is required to punch out." });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const record = await StudentAttendance.findOne({ student: studentId, date: dateKey });

    if (!record || record.status !== "PUNCHED_IN") {
      return res.status(400).json({ message: "You must punch in first before punching out." });
    }

    const now = new Date();
    record.punchOutTime = now;
    record.status = "PUNCHED_OUT";
    record.punchOutPhoto = photoUrl;
    record.punchOutLocation = { lat, lng };

    // Auto-calculate lecture attendance based on Punch IN and OUT times
    await recalcLectureAttendance(record);
    await record.save();

    return res.json({ message: "Punched Out successfully!", record });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── STUDENT: GET TODAY STATUS ──────────────────────────────────────── */

export const getTodayStatus = async (req, res) => {
  try {
    const studentId = req.user.id;

    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const record = await StudentAttendance.findOne({ student: studentId, date: dateKey })
      .populate("student", "name email")
      .lean();

    return res.json({ record: record || null });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── STUDENT: GET MY ATTENDANCE LOG ─────────────────────────────────── */

export const getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    const y = parseInt(year) || new Date().getFullYear();
    const m = month !== undefined ? parseInt(month) : new Date().getMonth();

    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

    const records = await StudentAttendance.find({
      student: studentId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();

    return res.json({ records });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── TEACHER/ADMIN: GET STUDENT ATTENDANCE LOGS ─────────────────────── */

export const getStudentAttendanceLogs = async (req, res) => {
  try {
    const { studentId, batchId, startDate, endDate, month, year } = req.query;

    let query = {};

    if (studentId && studentId !== "all") {
      query.student = studentId;
    }

    if (batchId && batchId !== "all") {
      query.batch = batchId;
    }

    // Date filtering
    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) dateCond.$gte = new Date(startDate);
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        dateCond.$lte = ed;
      }
      query.date = dateCond;
    } else if (month !== undefined && year) {
      const y = parseInt(year);
      const m = parseInt(month);
      query.date = {
        $gte: new Date(y, m, 1),
        $lte: new Date(y, m + 1, 0, 23, 59, 59, 999),
      };
    }

    const records = await StudentAttendance.find(query)
      .populate("student", "name email batch_name batch_no rollNo")
      .populate("batch", "batch_name batch_no")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({ records });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── ADMIN: EDIT PUNCH TIME ─────────────────────────────────────────── */

export const adminEditPunchTime = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { punchInTime, punchOutTime, reason } = req.body;

    const record = await StudentAttendance.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    // Store edit history
    record.editHistory.push({
      editedBy: adminId,
      editedAt: new Date(),
      oldPunchIn: record.punchInTime,
      oldPunchOut: record.punchOutTime,
      newPunchIn: punchInTime ? new Date(punchInTime) : record.punchInTime,
      newPunchOut: punchOutTime ? new Date(punchOutTime) : record.punchOutTime,
      reason: reason || "",
    });

    // Update times
    if (punchInTime) {
      record.punchInTime = new Date(punchInTime);
    }
    if (punchOutTime) {
      record.punchOutTime = new Date(punchOutTime);
    }

    // Update status based on times
    if (record.punchInTime && record.punchOutTime) {
      record.status = "PUNCHED_OUT";
    } else if (record.punchInTime) {
      record.status = "PUNCHED_IN";
    }

    // Recalculate lecture attendance
    await recalcLectureAttendance(record);
    await record.save();

    // Populate before sending back
    const updated = await StudentAttendance.findById(id)
      .populate("student", "name email batch_name batch_no rollNo")
      .populate("batch", "batch_name batch_no")
      .lean();

    return res.json({ message: "Attendance record updated successfully.", record: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
