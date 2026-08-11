import { StudentAttendance } from "../models/studentAttendance.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { sendPushToUser } from "../services/pushNotification.service.js";
import { notifyParents } from "../services/parentNotification.service.js";
import { getTeacherBatchIds } from "../utils/teacherScope.js";

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
  if (!parsed) return "Present"; 

  if (punchOutTime) {
    const { startHour, startMin } = parsed;
    const d = new Date(lectureDate);
    const lectureStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, startMin, 0);

    const punchOut = new Date(punchOutTime);
    // If the student punched out before this lecture even started, they are absent for it
    if (punchOut < lectureStart) {
      return "Absent";
    }
  }

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
      console.error("Geofence Error:", geoCheck.error);
      return res.status(403).json({ message: geoCheck.error });
    }

    if (!req.file) {
      console.error("Punch In Error: A photo selfie is required.");
      return res.status(400).json({ message: "A photo selfie is required to punch in." });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const batch = await findStudentBatch(studentId);
    if (!batch) {
      console.error(`Punch In Error: Student ${studentId} is not assigned to any batch.`);
      return res.status(400).json({ message: "You are not assigned to any batch." });
    }

    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const existing = await StudentAttendance.findOne({ student: studentId, date: dateKey });
    
    if (existing && existing.status !== "NOT_PUNCHED") {
      console.error(`Punch In Error: Student ${studentId} has already punched in today.`);
      return res.status(400).json({
        message: existing.status === "PUNCHED_IN"
          ? "You have already punched in today."
          : "You have already punched in and out today.",
      });
    }

    const now = new Date();
    
    // Check if late (after 09:10 AM IST)
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
    let attStatus = "Present";
    let lateAppStatus = "None";
    if (istTimeStr > "09:10") {
      attStatus = "Late";
      lateAppStatus = "Pending";
    }

    let savedRecord;
    if (existing) {
      existing.punchInTime = now;
      existing.status = "PUNCHED_IN";
      existing.punchInPhoto = photoUrl;
      existing.punchInLocation = { lat, lng };
      existing.attendanceStatus = attStatus;
      existing.lateApprovalStatus = lateAppStatus;
      await existing.save();
      savedRecord = existing;
    } else {
      savedRecord = await StudentAttendance.create({
        student: studentId,
        batch: batch._id,
        date: dateKey,
        punchInTime: now,
        status: "PUNCHED_IN",
        punchInPhoto: photoUrl,
        punchInLocation: { lat, lng },
        attendanceStatus: attStatus,
        lateApprovalStatus: lateAppStatus,
      });
    }

    if (attStatus === "Late") {
      // Calculate minutes late (Expected time is 09:00 AM)
      const expectedTime = new Date(now);
      expectedTime.setHours(9, 0, 0, 0);
      let diffMins = Math.floor((now.getTime() - expectedTime.getTime()) / 60000);
      if (diffMins < 0) diffMins = 0; // fallback just in case
      const parentMsg = `Your child punched in late today at ${istTimeStr}. They were ${diffMins} minutes late from the expected time (09:00 AM).`;
      await notifyParents([studentId], "Late Attendance Alert", parentMsg);
    }

    return res.json({ message: "Punched In successfully!", record: savedRecord });
  } catch (err) {
    console.error("Punch In Error:", err);
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
      console.error("Geofence Error:", geoCheck.error);
      return res.status(403).json({ message: geoCheck.error });
    }

    if (!req.file) {
      console.error("Punch Out Error: A photo selfie is required.");
      return res.status(400).json({ message: "A photo selfie is required to punch out." });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const today = new Date();
    const dateKey = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const record = await StudentAttendance.findOne({ student: studentId, date: dateKey });

    if (!record || record.status !== "PUNCHED_IN") {
      console.error(`Punch Out Error: Student ${studentId} attempted to punch out without punching in.`);
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
    
    // Notify student
    await sendPushToUser(studentId, "Student", {
      title: "Punched Out",
      body: "You have successfully punched out.",
      url: "/student/attendance"
    });



    return res.json({ message: "Punched Out successfully!", record });
  } catch (err) {
    console.error("Punch Out Error:", err);
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
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let query = {};

    if (userRole === "teacher") {
      const allocatedBatchIds = await getTeacherBatchIds(userId);
      query.batch = { $in: allocatedBatchIds };
    }

    if (studentId && studentId !== "all") {
      query.student = studentId;
    }

    if (batchId && batchId !== "all") {
      if (userRole === "teacher") {
        // Ensure requested batch is within allocated batches
        const allocatedBatchIds = await getTeacherBatchIds(userId);
        if (allocatedBatchIds.some(id => id.toString() === batchId.toString())) {
          query.batch = batchId;
        } else {
          query.batch = null; // No match
        }
      } else {
        query.batch = batchId;
      }
    }

    // Date filtering
    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) {
        const [y, m, d] = startDate.split('-');
        dateCond.$gte = new Date(y, m - 1, d);
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-');
        const ed = new Date(y, m - 1, d);
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

    const validRecords = records.filter(record => record.student != null);

    let finalRecords = [...validRecords];

    const isSingleDay = startDate && endDate && startDate === endDate;
    const isNoDate = !startDate && !endDate && month === undefined;

    // Inject absent records for un-punched students for single day or today
    if (isSingleDay || isNoDate) {
      let targetDate = new Date();
      if (isSingleDay) {
        const [y, m, d] = startDate.split('-');
        targetDate = new Date(y, m - 1, d);
      }
      targetDate.setHours(0, 0, 0, 0);

      let studentQuery = {};
      let targetBatches = [];
      
      if (batchId && batchId !== "all") {
        const b = await Batch.findById(batchId).lean();
        if (b) {
          studentQuery.batch_name = b.batch_name;
          if (b.batch_no) studentQuery.batch_no = b.batch_no;
          targetBatches.push(b);
        }
      } else {
        if (userRole === "teacher") {
          const allocatedBatchIds = await getTeacherBatchIds(userId);
          targetBatches = await Batch.find({ _id: { $in: allocatedBatchIds } }).lean();
        } else {
          targetBatches = await Batch.find().lean();
        }
      }

      if (userRole === "teacher" && (!batchId || batchId === "all")) {
        const allocatedBatchIds = await getTeacherBatchIds(userId);
        const allowedBatches = await Batch.find({ _id: { $in: allocatedBatchIds } }).lean();
        if (allowedBatches.length > 0) {
          const names = allowedBatches.map(b => b.batch_name);
          studentQuery.batch_name = { $in: names };
        } else {
          studentQuery.batch_name = null; // force empty
        }
      }

      if (studentId && studentId !== "all") {
        studentQuery._id = studentId;
      }

      const allStudents = await Student.find(studentQuery).lean();
      const punchedInStudentIds = new Set(validRecords.map(r => r.student._id.toString()));
      const missingStudents = allStudents.filter(s => !punchedInStudentIds.has(s._id.toString()));

      for (const st of missingStudents) {
        const sBatch = targetBatches.find(b => b.batch_name === st.batch_name && b.batch_no === st.batch_no);
        finalRecords.push({
          _id: "missing_" + st._id.toString(),
          student: {
            _id: st._id,
            name: st.name,
            email: st.email,
            rollNo: st.rollNo,
            batch_name: st.batch_name,
            batch_no: st.batch_no,
          },
          batch: sBatch || { batch_name: st.batch_name, batch_no: st.batch_no },
          date: targetDate,
          status: "NOT_PUNCHED",
          attendanceStatus: "Absent",
          lateApprovalStatus: "None",
          punchInTime: null,
          punchOutTime: null,
          lectureAttendance: [],
          editHistory: []
        });
      }
    }

    return res.json({ records: finalRecords });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── ADMIN: EDIT PUNCH TIME ─────────────────────────────────────────── */

export const adminEditPunchTime = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { punchInTime, punchOutTime, reason, date, batch, student } = req.body;

    let record;
    if (id.startsWith("missing_")) {
      const studentId = id.replace("missing_", "");
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      record = await StudentAttendance.findOne({ student: studentId, date: d });
      if (!record) {
        record = new StudentAttendance({
          student: studentId,
          batch: batch,
          date: d,
          status: "NOT_PUNCHED",
          attendanceStatus: "Absent",
        });
      }
    } else {
      record = await StudentAttendance.findById(id);
    }

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

    // Explicit status overrides
    if (req.body.attendanceStatus) {
      record.attendanceStatus = req.body.attendanceStatus;
    }
    if (req.body.lateApprovalStatus) {
      record.lateApprovalStatus = req.body.lateApprovalStatus;
      if (req.body.lateApprovalStatus === "Approved" || req.body.lateApprovalStatus === "Rejected") {
        record.lateApprovedBy = adminId;
        record.lateApprovedAt = new Date();
      }
    } else if (record.punchInTime && !req.body.attendanceStatus) {
      // Recalculate Late Status
      const pinDate = new Date(record.punchInTime);
      const istTimeStr = pinDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
      if (istTimeStr > "09:10") {
        if (record.lateApprovalStatus !== "Approved") {
          record.attendanceStatus = "Late";
          record.lateApprovalStatus = "Pending";
        }
      } else {
        record.attendanceStatus = "Present";
        record.lateApprovalStatus = "None";
      }
    }

    // Recalculate lecture attendance
    await recalcLectureAttendance(record);
    await record.save();

    // Populate before sending back
    const updated = await StudentAttendance.findById(record._id)
      .populate("student", "name email batch_name batch_no rollNo")
      .populate("batch", "batch_name batch_no")
      .lean();
      
    if (updated.student?._id) {
       await sendPushToUser(updated.student._id, "Student", {
         title: "Attendance Updated",
         body: "An admin has updated your attendance record.",
         url: "/student/attendance"
       });
       
       let parentMsg = `An admin has updated the attendance for ${updated.date ? new Date(updated.date).toDateString() : "the day"}.\n`;
       if (updated.lectureAttendance && updated.lectureAttendance.length > 0) {
         updated.lectureAttendance.forEach(lec => {
           parentMsg += `- ${lec.lectureTitle} (${lec.timeSlot}): ${lec.status}\n`;
         });
       }
       await notifyParents([updated.student._id], "Attendance Updated", parentMsg);
    }

    return res.json({ message: "Attendance record updated successfully.", record: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ─── ADMIN: APPROVE LATE ATTENDANCE ─────────────────────────────────────── */

export const adminApproveLateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const record = await StudentAttendance.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    let isLate = record.attendanceStatus === "Late" && record.lateApprovalStatus === "Pending";
    
    // Retroactive check for older records
    if (!isLate && record.status !== "NOT_PUNCHED" && record.punchInTime && record.lateApprovalStatus !== "Approved" && record.lateApprovalStatus !== "Rejected") {
      const pinDate = new Date(record.punchInTime);
      const istTimeStr = pinDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
      if (istTimeStr > "09:10") {
        isLate = true;
      }
    }

    if (!isLate) {
      return res.status(400).json({ message: "Record is not pending late approval." });
    }

    record.attendanceStatus = "Present";
    record.lateApprovalStatus = "Approved";
    record.lateApprovedBy = adminId;
    record.lateApprovedAt = new Date();

    await record.save();

    const updated = await StudentAttendance.findById(id)
      .populate("student", "name email batch_name batch_no rollNo")
      .populate("batch", "batch_name batch_no")
      .lean();

    return res.json({ message: "Late attendance approved successfully.", record: updated });
  } catch (err) {
    console.error("Approve Late Attendance Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ─── ADMIN: REJECT LATE ATTENDANCE ─────────────────────────────────────── */

export const adminRejectLateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const record = await StudentAttendance.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    let isLate = record.attendanceStatus === "Late" && record.lateApprovalStatus === "Pending";
    
    // Retroactive check for older records
    if (!isLate && record.status !== "NOT_PUNCHED" && record.punchInTime && record.lateApprovalStatus !== "Approved" && record.lateApprovalStatus !== "Rejected") {
      const pinDate = new Date(record.punchInTime);
      const istTimeStr = pinDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
      if (istTimeStr > "09:10") {
        isLate = true;
      }
    }

    if (!isLate) {
      return res.status(400).json({ message: "Record is not pending late approval." });
    }

    record.attendanceStatus = "Late";
    // Using "Rejected" might need schema update if not in Enum. Wait, enum for lateApprovalStatus: ["Pending", "Approved", "None"]
    // I should update the enum to include "Rejected". Or wait, I can just leave it as "Pending"? No, the user said "Late Rejected (if applicable)"
    // Let me check if I should update the schema. Yes, I'll update the schema in another tool call. For now, I'll set it to "Rejected".
    record.lateApprovalStatus = "Rejected";
    record.lateApprovedBy = adminId;
    record.lateApprovedAt = new Date();

    await record.save();

    const updated = await StudentAttendance.findById(id)
      .populate("student", "name email batch_name batch_no rollNo")
      .populate("batch", "batch_name batch_no")
      .lean();

    return res.json({ message: "Late attendance rejected successfully.", record: updated });
  } catch (err) {
    console.error("Reject Late Attendance Error:", err);
    return res.status(500).json({ message: err.message });
  }
};
