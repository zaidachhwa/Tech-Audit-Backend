import { Schedule } from "../models/schedule.model.js";
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import Batch from "../models/batch.model.js";
import { Submission } from "../models/submission.model.js";
import { Announcement } from "../models/announcement.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { Lecture } from "../models/lecture.model.js";
import { sendPushToBatch, sendPushToTeachers, sendPushToUser } from "../services/pushNotification.service.js";
import { notifyParents } from "../services/parentNotification.service.js";

/**
 * Universal time slot parser supporting both 24-hour ("10:00 - 12:00")
 * and 12-hour AM/PM formats ("09:00 AM - 10:45 AM", "2:30 PM - 4:00 PM").
 */
export const parseTimeSlot = (slot) => {
  if (!slot || typeof slot !== "string") return null;
  const parts = slot.split("-");
  if (parts.length !== 2) return null;

  const toMinutes = (t) => {
    if (!t) return null;
    const str = t.trim();
    // Match 12-hour (e.g. "9:00 AM", "02:30 PM", "9:00am") or 24-hour ("14:30", "09:00")
    const match = str.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])?$/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3] ? match[3].toUpperCase() : null;

    if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;

    if (modifier) {
      if (hours < 1 || hours > 12) return null;
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
    } else {
      if (hours < 0 || hours > 23) return null;
    }

    return hours * 60 + minutes;
  };

  const start = toMinutes(parts[0]);
  const end = toMinutes(parts[1]);
  if (start === null || end === null || end <= start) return null;
  return { start, end };
};

export const overlaps = (a, b) => a.start < b.end && b.start < a.end;

/**
 * Helper to resolve all Batch ObjectIds belonging to a student (direct, mapping, or course/semester)
 */
export const getStudentBatchIds = async (studentId, studentDoc = null) => {
  const student = studentDoc || await Student.findById(studentId).lean();
  if (!student) return [];

  const batchIdSet = new Set();

  // 1. Direct matching on batch_name + batch_no
  if (student.batch_name && student.batch_no) {
    const directBatch = await Batch.findOne({
      batch_name: student.batch_name,
      batch_no: student.batch_no
    }).select("_id").lean();
    if (directBatch) batchIdSet.add(directBatch._id.toString());
  }

  // 2. Matching via StudentBatchMapping
  try {
    const StudentBatchMapping = (await import("../models/studentBatchMapping.model.js")).default;
    const mappings = await StudentBatchMapping.find({ student: studentId }).select("batch").lean();
    mappings.forEach(m => {
      if (m.batch) batchIdSet.add(m.batch.toString());
    });
  } catch (e) {
    // optional mapping fallback
  }

  // 3. Matching via Batch.students array
  const enrolledBatches = await Batch.find({ students: studentId }).select("_id").lean();
  enrolledBatches.forEach(b => batchIdSet.add(b._id.toString()));

  // 4. Matching via course + semester if specified
  if (student.course && student.semester) {
    const courseBatches = await Batch.find({
      course: student.course,
      semester: student.semester
    }).select("_id").lean();
    courseBatches.forEach(b => batchIdSet.add(b._id.toString()));
  }

  return Array.from(batchIdSet);
};

const validateTeacherConflicts = async (proposedLectures, currentScheduleId = null) => {
  const query = {};
  if (currentScheduleId) {
    query._id = { $ne: currentScheduleId };
  }

  const existingSchedules = await Schedule.find(query)
    .select("subject batch teacher lectures")
    .populate("batch", "batch_name batch_no")
    .populate("teacher", "name")
    .populate("lectures.teacher", "name")
    .lean();

  for (const proposed of proposedLectures) {
    const { date, time_slot, teacherIdRaw } = proposed;

    if (!date || !time_slot) continue; 
    const proposedTime = parseTimeSlot(time_slot);
    if (!proposedTime) continue;
    const proposedDate = new Date(date).toISOString().split("T")[0];
    const proposedTeacherId = String(teacherIdRaw || "");
    if (!proposedTeacherId) continue;

    for (const existing of existingSchedules) {
      for (const exLec of existing.lectures || []) {
        // Skip current lecture being edited if it matches exactly
        if (proposed.currentLectureId && String(exLec._id) === String(proposed.currentLectureId)) continue;
        
        if (!exLec.date || !exLec.time_slot) continue;

        const exTime = parseTimeSlot(exLec.time_slot);
        if (!exTime) continue;

        const exDate = new Date(exLec.date).toISOString().split("T")[0];
        if (exDate !== proposedDate) continue;
        if (!overlaps(proposedTime, exTime)) continue;

        const exTeacherId = typeof exLec.teacher === "object"
          ? (exLec.teacher?._id?.toString() || "")
          : (exLec.teacher?.toString() || "");

        const scheduleTeacherId = typeof existing.teacher === "object"
          ? (existing.teacher?._id?.toString() || "")
          : (existing.teacher?.toString() || "");

        const actualTeacherId = exTeacherId || scheduleTeacherId;

        if (actualTeacherId && actualTeacherId === proposedTeacherId) {
          return {
            hasConflict: true,
            conflictDetails: {
              teacherName: exLec.teacher?.name || existing.teacher?.name || "Unknown Teacher",
              subject: existing.subject,
              date: exDate,
              time: exLec.time_slot,
              batch: existing.batch?.batch_name ? `${existing.batch.batch_name} ${existing.batch.batch_no ? '#' + existing.batch.batch_no : ''}` : "Unknown Batch"
            }
          };
        }
      }
    }
  }
  
  return { hasConflict: false };
};

/**
 * Create a new Lecture Schedule
 * Role: Admin
 */

export const createSchedule = async (req, res) => {
  try {
    const { subject, batch, batchIds, teacher, lectures } = req.body;
    
    const finalBatches = batchIds && batchIds.length > 0 ? batchIds : (batch ? [batch] : []);

    if (!subject || finalBatches.length === 0 || !teacher) {
      return res.status(400).json({ message: "Subject, at least one batch ID, and teacher ID are required." });
    }

    // Verify batches exist
    const batchesExist = await Batch.find({ _id: { $in: finalBatches } });
    if (batchesExist.length !== finalBatches.length) {
      return res.status(404).json({ message: "One or more target Batches not found." });
    }

    // Past Date & Past Time Validation (Removed)

    // Teacher Conflict Validation (Double Booking Check)
    if (lectures && Array.isArray(lectures)) {
      const proposedLectures = lectures.map(l => ({
        date: l.date,
        time_slot: l.time_slot,
        teacherIdRaw: l.teacher || teacher
      }));
      const conflictCheck = await validateTeacherConflicts(proposedLectures);
      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          message: "This teacher is already assigned to another lecture during the selected date and time. Please select another teacher or choose a different time slot.",
          conflictDetails: conflictCheck.conflictDetails
        });
      }
    }

    const newSchedule = await Schedule.create({
      subject,
      batches: finalBatches,
      batch: finalBatches[0], // Keep for backward compatibility
      teacher,
      lectures: lectures || [],
      verificationStatus: "approved",
      createdByRole: req.user.role === "admin" ? "admin" : "teacher"
    });

    // Detect Saturday lectures that need announcements
    const newSaturdayLectures = [];
    if (lectures && Array.isArray(lectures)) {
      for (const lec of lectures) {
        if (lec.isSaturdayLecture) {
          newSaturdayLectures.push(lec);
        }
      }
    }

    if (newSaturdayLectures.length > 0) {
      try {
        const batchObj = await Batch.findById(batch);
        for (const lec of newSaturdayLectures) {
          const formattedDate = lec.date ? new Date(lec.date).toLocaleDateString() : "TBD";
          const title = `Saturday Session Scheduled: ${subject}`;
          const message = `A Saturday lecture session has been scheduled for "${subject}" on ${formattedDate}. Please verify the timing and details.`;
          
          await Announcement.create({
            teacher: teacher,
            title,
            message,
            batch: batchObj ? batchObj.batch_name : "All Batches",
            priority: "important"
          });
        }
      } catch (announceErr) {
        console.error("Failed to generate automated Saturday announcement:", announceErr);
      }
    }

    const populated = await Schedule.findById(newSchedule._id)
      .populate("batch", "batch_name batch_no")
      .populate("batches", "batch_name batch_no")
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
export const listSchedules = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query = {};

    if (role === "teacher") {
      const mongoose = await import("mongoose");
      const uid = new mongoose.default.Types.ObjectId(userId);
      query.$or = [
        { teacher: uid },
        { "lectures.teacher": uid },
        { "lectures.originalTeacher": uid },
        { "lectures.transferHistory.originalTeacher": uid }
      ];
    } else if (role === "student") {
      const student = await Student.findById(userId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const studentBatchIds = await getStudentBatchIds(userId, student);
      if (studentBatchIds.length === 0) {
        return res.status(200).json([]);
      }

      const mongoose = await import("mongoose");
      const objIds = studentBatchIds.map(id => new mongoose.default.Types.ObjectId(id));

      query.$or = [
        { batch: { $in: objIds } },
        { batches: { $in: objIds } }
      ];
    }

    const schedules = await Schedule.find(query)
      .populate("batch", "batch_name batch_no course semester")
      .populate("batches", "batch_name batch_no course semester")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email")
      .populate("lectures.originalTeacher", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Query BatchLectures that are scheduled (have dueDate set)
    let batchLecturesQuery = {
      dueDate: { $exists: true, $ne: null }
    };

    if (role === "teacher") {
      batchLecturesQuery.$or = [
        { assignedTo: userId },
        { originalTeacher: userId }
      ];
    } else if (role === "student") {
      const studentBatchIds = await getStudentBatchIds(userId);
      if (studentBatchIds.length > 0) {
        batchLecturesQuery.batch = { $in: studentBatchIds };
      } else {
        return res.status(200).json(schedules);
      }
    }

    const scheduledBatchLectures = await BatchLecture.find(batchLecturesQuery)
      .populate("batch", "batch_name batch_no course semester")
      .populate("syllabus", "subject name")
      .populate("assignedTo", "name email")
      .populate("originalTeacher", "name email")
      .lean();

    // Build lookup set of existing lectures in Schedule documents to prevent double-display
    const existingScheduleLectures = new Set();
    schedules.forEach((sch) => {
      const bIds = [];
      if (sch.batches && sch.batches.length > 0) {
        sch.batches.forEach(b => bIds.push(b._id ? b._id.toString() : b.toString()));
      } else if (sch.batch) {
        bIds.push(sch.batch._id ? sch.batch._id.toString() : sch.batch.toString());
      }
      
      const subj = (sch.subject || "").trim().toLowerCase();
      (sch.lectures || []).forEach((lec) => {
        const title = (lec.title || "").trim().toLowerCase();
        if (subj && title) {
          bIds.forEach(bId => existingScheduleLectures.add(`${bId}_${subj}_${title}`));
        }
      });
    });

    // Group scheduledBatchLectures by batch._id and syllabus._id, excluding any already in Schedule
    const groups = {};
    for (const bl of scheduledBatchLectures) {
      if (!bl.batch || !bl.syllabus) continue;
      const batchId = bl.batch._id.toString();
      const syllabusId = bl.syllabus._id.toString();
      const subj = (bl.syllabus.subject || bl.syllabus.name || "").trim().toLowerCase();
      const title = (bl.title || "").trim().toLowerCase();

      // Skip if this lecture was already returned via Schedule document
      if (existingScheduleLectures.has(`${batchId}_${subj}_${title}`)) {
        continue;
      }

      const key = `${batchId}_${syllabusId}`;

      if (!groups[key]) {
        groups[key] = {
          _id: `batch_syllabus_${key}`,
          subject: bl.syllabus.subject || bl.syllabus.name || "Syllabus Lecture",
          batch: bl.batch,
          batches: [bl.batch],
          teacher: bl.assignedTo || { name: "Unassigned", email: "" },
          lectures: [],
          verificationStatus: "approved",
          createdByRole: "admin",
          isFromSyllabusTracker: true
        };
      }

      groups[key].lectures.push({
        _id: bl._id,
        title: bl.title,
        description: bl.description,
        date: bl.dueDate,
        teacher: bl.assignedTo,
        status: bl.completionStatus === "Completed" ? "Done" : (bl.completionStatus === "In Progress" ? "Scheduled" : "Planned"),
        homework: null,
        isSaturdayLecture: false,
        isTransferred: bl.isTransferred,
        originalTeacher: bl.originalTeacher,
        transferHistory: bl.transferHistory
      });
    }

    const batchSyllabusSchedules = Object.values(groups).filter(g => g.lectures.length > 0);
    const allSchedules = [...schedules, ...batchSyllabusSchedules];

    // Sanitize teacher-private notes for student role
    if (role === "student") {
      allSchedules.forEach(sch => {
        (sch.lectures || []).forEach(lec => {
          lec.notes_teacher = undefined;
        });
      });
    }

    return res.status(200).json(allSchedules);
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
    const { id } = req.params;

    if (id.startsWith("batch_syllabus_")) {
      const parts = id.replace("batch_syllabus_", "").split("_");
      const batchId = parts[0];
      const syllabusId = parts[1];

      let query = {
        batch: batchId,
        syllabus: syllabusId,
        dueDate: { $exists: true, $ne: null }
      };

      if (role === "teacher") {
        query.$or = [
          { assignedTo: userId },
          { originalTeacher: userId }
        ];
      }

      const bls = await BatchLecture.find(query)
        .populate("batch", "batch_name batch_no course semester")
        .populate("syllabus", "subject name")
        .populate("assignedTo", "name email")
        .populate("originalTeacher", "name")
        .sort({ order: 1, dueDate: 1 })
        .lean();

      if (bls.length === 0) {
        return res.status(404).json({ message: "Schedule not found" });
      }

      const firstLec = bls[0];
      const virtualSchedule = {
        _id: id,
        subject: firstLec.syllabus?.subject || firstLec.syllabus?.name || "Syllabus Lectures",
        batch: firstLec.batch,
        batches: [firstLec.batch],
        teacher: firstLec.assignedTo || { name: "Unassigned", email: "" },
        lectures: bls.map(bl => ({
          _id: bl._id,
          title: bl.title,
          description: bl.description,
          date: bl.dueDate,
          teacher: bl.assignedTo,
          status: bl.completionStatus === "Completed" ? "Done" : (bl.completionStatus === "In Progress" ? "Scheduled" : "Planned"),
          homework: null,
          isSaturdayLecture: false,
          isTransferred: bl.isTransferred,
          originalTeacher: bl.originalTeacher,
          transferHistory: bl.transferHistory
        })),
        verificationStatus: "approved",
        createdByRole: "admin",
        isFromSyllabusTracker: true
      };

      if (role === "student") {
        const studentBatchIds = await getStudentBatchIds(userId);
        if (!studentBatchIds.includes(batchId)) {
          return res.status(403).json({ message: "Access denied. This schedule is for another batch." });
        }
        virtualSchedule.lectures.forEach(l => {
          l.notes_teacher = undefined;
        });
      }

      return res.status(200).json(virtualSchedule);
    }

    const schedule = await Schedule.findById(id)
      .populate("batch", "batch_name batch_no course semester")
      .populate("batches", "batch_name batch_no course semester")
      .populate("teacher", "name email")
      .populate("lectures.teacher", "name email")
      .populate("lectures.originalTeacher", "name");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    // Role-based visibility validation
    if (role === "teacher") {
      const isPrimary = schedule.teacher?._id?.toString() === userId;
      const isLectureTeacher = schedule.lectures.some(l => 
        (l.teacher && l.teacher._id?.toString() === userId) ||
        (l.originalTeacher && l.originalTeacher._id?.toString() === userId)
      );
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. This schedule is assigned to another teacher." });
      }
    }

    if (role === "student") {
      const studentBatchIds = await getStudentBatchIds(userId);
      const scheduleBatchIds = [
        ...(schedule.batches || []).map(b => b._id ? b._id.toString() : b.toString()),
        schedule.batch ? (schedule.batch._id ? schedule.batch._id.toString() : schedule.batch.toString()) : null
      ].filter(Boolean);

      const hasAccess = scheduleBatchIds.some(id => studentBatchIds.includes(id));
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied. This schedule is for another batch." });
      }

      (schedule.lectures || []).forEach(lec => {
        lec.notes_teacher = undefined;
      });
    }

    return res.status(200).json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update single BatchLecture properties from Scheduler Grid
 */
export const updateBatchLectureFromScheduler = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, teacherId, status } = req.body;

    const batchLecture = await BatchLecture.findById(id);
    if (!batchLecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    if (date) {
      batchLecture.dueDate = new Date(date);
    }
    if (teacherId !== undefined) {
      batchLecture.assignedTo = teacherId || null;
    }
    if (status) {
      const statusMap = {
        "Done": "Completed",
        "Scheduled": "In Progress",
        "Planned": "Pending"
      };
      batchLecture.completionStatus = statusMap[status] || status;
      if (batchLecture.completionStatus === "Completed") {
        batchLecture.completedAt = new Date();
      }
    }

    await batchLecture.save();
    
    if (teacherId !== undefined && String(teacherId) !== String(batchLecture.assignedTo)) {
      // It's a teacher switch
      const bObj = await Batch.findById(batchLecture.batch);
      
      // Notify new teacher
      await sendPushToUser(teacherId, "Teacher", {
        title: "Lecture Assigned",
        body: `You have been assigned to teach ${batchLecture.title} for batch ${bObj?.batch_name}`,
        url: "/teacher/schedule"
      });
      
      // Notify students
      if (bObj) {
         await sendPushToBatch(bObj.batch_name, {
           title: "Lecture Teacher Changed",
           body: `The teacher for ${batchLecture.title} has been updated.`,
           url: "/student/dashboard"
         });
         
         if (bObj.students && bObj.students.length > 0) {
           await notifyParents(bObj.students, "Lecture Update", `The teacher for ${batchLecture.title} has been changed.`);
         }
      }
    }

    // Sync back to template Lecture if exists
    if (batchLecture.templateLecture) {
      const template = await Lecture.findById(batchLecture.templateLecture);
      if (template) {
        if (date) template.dueDate = new Date(date);
        if (teacherId !== undefined) template.assignedTo = teacherId || null;
        await template.save();
      }
    }

    return res.status(200).json({ message: "Lecture updated successfully", lecture: batchLecture });
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
    const { subject, batch, batchIds, teacher, lectures } = req.body;

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (role === "student") {
      return res.status(403).json({ message: "Forbidden: Students cannot edit schedules." });
    }

    if (role === "teacher") {
      // Validate that this is the assigned teacher (primary or lecture-level) or unassigned/pending schedule
      const isPrimary = String(schedule.teacher) === String(userId);
      const isLectureTeacher = schedule.lectures.some(l => l.teacher && String(l.teacher?._id || l.teacher) === String(userId));
      const isUnassignedOrPending = !schedule.teacher || schedule.verificationStatus === "pending_teacher" || schedule.verificationStatus === "pending";
      if (!isPrimary && !isLectureTeacher && !isUnassignedOrPending) {
        return res.status(403).json({ message: "Access denied. You can only edit your own schedules." });
      }
    }

    // Past Date & Past Time Validation (Removed)

    // Teacher Conflict Validation (Double Booking Check)
    if (lectures && Array.isArray(lectures)) {
      const proposedLectures = lectures.map(l => ({
        date: l.date,
        time_slot: l.time_slot,
        teacherIdRaw: l.teacher || teacher,
        currentLectureId: l._id && !String(l._id).startsWith("temp-") ? l._id : null
      }));
      const conflictCheck = await validateTeacherConflicts(proposedLectures);
      if (conflictCheck.hasConflict) {
        return res.status(409).json({
          message: "This teacher is already assigned to another lecture during the selected date and time. Please select another teacher or choose a different time slot.",
          conflictDetails: conflictCheck.conflictDetails
        });
      }
    }
    // Apply updates
    if (subject) schedule.subject = subject;
    const finalBatches = batchIds && batchIds.length > 0 ? batchIds : (batch ? [batch] : null);
    if (finalBatches) {
      schedule.batches = finalBatches;
      schedule.batch = finalBatches[0]; // Keep for backward compatibility
    }
    if (teacher) schedule.teacher = teacher;

    // Detect Saturday lectures that need announcements before saving new lectures list
    const newSaturdayLectures = [];
    if (lectures && Array.isArray(lectures)) {
      for (const lec of lectures) {
        if (lec.isSaturdayLecture) {
          if (!lec._id || String(lec._id).startsWith("temp-")) {
            newSaturdayLectures.push(lec);
          } else {
            const oldLec = schedule.lectures.id(lec._id);
            if (!oldLec) {
              newSaturdayLectures.push(lec);
            } else {
              const oldDate = oldLec.date ? new Date(oldLec.date).toISOString().split('T')[0] : "";
              const newDate = lec.date ? new Date(lec.date).toISOString().split('T')[0] : "";
              if (oldDate !== newDate || !oldLec.isSaturdayLecture) {
                newSaturdayLectures.push(lec);
              }
            }
          }
        }
      }
    }

    // Detect Venue switches
    const venueSwitches = [];
    if (lectures && Array.isArray(lectures)) {
      for (const lec of lectures) {
        if (lec._id && !String(lec._id).startsWith("temp-")) {
          const oldLec = schedule.lectures.id(lec._id);
          if (oldLec && oldLec.venue && lec.venue && oldLec.venue !== lec.venue) {
            venueSwitches.push(lec);
          }
        }
      }
    }

    if (lectures) {
      schedule.lectures = lectures;
    }

    await schedule.save();

    if (newSaturdayLectures.length > 0) {
      try {
        const batchIds = schedule.batches && schedule.batches.length > 0 ? schedule.batches : (schedule.batch ? [schedule.batch] : []);
        const finalSubject = schedule.subject;
        const finalTeacher = schedule.teacher;
        
        for (const lec of newSaturdayLectures) {
          const formattedDate = lec.date ? new Date(lec.date).toLocaleDateString() : "TBD";
          const title = `Saturday Session Scheduled: ${finalSubject}`;
          const message = `A Saturday lecture session has been scheduled for "${finalSubject}" on ${formattedDate}. Please verify the timing and details.`;
          
            let batchNames = "All Batches";
            if (batchIds.length > 0) {
              const batchObjs = await Batch.find({ _id: { $in: batchIds } });
              batchNames = batchObjs.map(b => b.batch_name).join(", ");
            }

            await Announcement.create({
              teacher: finalTeacher,
              title,
              message,
              batch: batchNames,
              priority: "important"
            });
        }
      } catch (announceErr) {
        console.error("Failed to generate automated Saturday announcement on update:", announceErr);
      }
    }
    
    // Send Push Notifications for Venue Switches
    if (venueSwitches.length > 0) {
      try {
        const batchIds = schedule.batches && schedule.batches.length > 0 ? schedule.batches : (schedule.batch ? [schedule.batch] : []);
        const batchObjs = await Batch.find({ _id: { $in: batchIds } });
        
        for (const batchObj of batchObjs) {
           for (const lec of venueSwitches) {
             await sendPushToBatch(batchObj.batch_name, {
               title: "Venue Changed",
               body: `Venue for ${lec.title || "a lecture"} has been updated to ${lec.venue}.`,
               url: "/student/dashboard"
             });
             
             if (batchObj.students && batchObj.students.length > 0) {
               await notifyParents(batchObj.students, "Lecture Venue Changed", `Venue for ${lec.title || "a lecture"} has been updated to ${lec.venue}.`);
             }
             // Notify teacher if there is a teacher assigned to this lecture
             if (lec.teacher) {
               await sendPushToUser(lec.teacher, "Teacher", {
                 title: "Venue Changed",
                 body: `Venue for ${lec.title || "a lecture"} has been updated to ${lec.venue}.`,
                 url: "/teacher/schedule"
               });
             }
           }
        }
      } catch (e) {
        console.error("Error sending venue switch pushes:", e);
      }
    }

    const populated = await Schedule.findById(schedule._id)
      .populate("batch", "batch_name batch_no")
      .populate("batches", "batch_name batch_no")
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
    const { id: userId, role } = req.user;
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    if (role === "teacher") {
      const isPrimaryTeacher = String(schedule.teacher) === String(userId);
      const isLectureTeacher = (schedule.lectures || []).some(l => String(l.teacher?._id || l.teacher) === String(userId));
      const isCreator = schedule.createdBy ? String(schedule.createdBy) === String(userId) : false;
      const isPendingOrUnassigned = !schedule.teacher || schedule.verificationStatus === "pending_teacher" || schedule.verificationStatus === "pending";

      if (!isPrimaryTeacher && !isLectureTeacher && !isCreator && !isPendingOrUnassigned) {
        return res.status(403).json({ message: "Access denied. You can only delete schedules assigned to you or created by you." });
      }
    }

    await Schedule.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Helper to synchronize a schedule lecture homework with the standalone Homework collection
 * so it automatically appears in /api/homework, /api/student-homework, AssignTask and StudentAssignments.
 */
export const syncScheduleLectureToHomework = async (schedule, lecture, userId) => {
  if (!lecture || !lecture.homework || !lecture.homework.title || !lecture.homework.title.trim()) {
    return;
  }

  try {
    const Homework = (await import("../models/homework.model.js")).default;
    const targetBatchIds = (schedule.batches && schedule.batches.length > 0)
      ? schedule.batches.map(b => b._id || b)
      : (schedule.batch ? [schedule.batch._id || schedule.batch] : []);

    const batches = await Batch.find({ _id: { $in: targetBatchIds } }).lean();
    let targetStudents = [];
    let batchMap = {};

    for (const b of batches) {
      if (b.students && b.students.length > 0) {
        for (const sid of b.students) {
          targetStudents.push(sid);
          batchMap[sid.toString()] = b;
        }
      }

      const studentsInBatch = await Student.find({
        batch_name: b.batch_name,
        batch_no: b.batch_no
      }).select("_id").lean();

      for (const s of studentsInBatch) {
        targetStudents.push(s._id);
        batchMap[s._id.toString()] = b;
      }

      try {
        const StudentBatchMapping = (await import("../models/studentBatchMapping.model.js")).default;
        const mappings = await StudentBatchMapping.find({ batch: b._id }).select("student").lean();
        for (const m of mappings) {
          if (m.student) {
            targetStudents.push(m.student);
            batchMap[m.student.toString()] = b;
          }
        }
      } catch (e) {}
    }

    const uniqueStudentIds = [...new Set(targetStudents.map(id => id.toString()))];

    for (const sId of uniqueStudentIds) {
      const bDoc = batchMap[sId];

      const existingSubmissions = await Submission.find({
        schedule: schedule._id,
        lectureId: lecture._id,
        student: sId
      }).lean();

      const formattedSubmissions = existingSubmissions.map(sub => ({
        submissionText: sub.submissionText || "",
        fileName: sub.fileName || "attachment",
        fileUrl: sub.fileUrl || "",
        attachments: sub.fileUrl ? [sub.fileUrl] : [],
        submittedAt: sub.createdAt || new Date(),
        status: sub.status === "reviewed" ? "approved" : "pending_review",
        marks: sub.marks,
        remarks: sub.remarks || ""
      }));

      const existingHw = await Homework.findOne({ lecture: lecture._id, student: sId });

      if (existingHw) {
        existingHw.title = lecture.homework.title;
        existingHw.description = lecture.homework.description || "";
        existingHw.comment = lecture.homework.description || "";
        existingHw.dueDate = lecture.homework.due_date || lecture.date || new Date();
        existingHw.course = bDoc?.course || existingHw.course || "";
        existingHw.semester = bDoc?.semester || existingHw.semester || "";
        existingHw.subjectName = schedule.subject || existingHw.subjectName || "";
        existingHw.batch = bDoc?._id || existingHw.batch;
        existingHw.batchIds = targetBatchIds;
        existingHw.batchName = bDoc?.batch_name || existingHw.batchName;
        existingHw.batchNumber = bDoc?.batch_no || existingHw.batchNumber;
        if (formattedSubmissions.length > 0 && (!existingHw.submissions || existingHw.submissions.length === 0)) {
          existingHw.submissions = formattedSubmissions;
          existingHw.status = "pending_review";
        }
        await existingHw.save();
      } else {
        await Homework.create({
          title: lecture.homework.title,
          description: lecture.homework.description || "",
          comment: lecture.homework.description || "",
          course: bDoc?.course || "",
          semester: bDoc?.semester || "",
          subject: null,
          subjectName: schedule.subject || "",
          dueDate: lecture.homework.due_date || lecture.date || new Date(),
          lecture: lecture._id,
          student: sId,
          batch: bDoc?._id || null,
          batchIds: targetBatchIds,
          batchName: bDoc?.batch_name || "",
          batchNumber: bDoc?.batch_no || "",
          assignedBy: schedule.teacher?._id || schedule.teacher || userId,
          status: formattedSubmissions.length > 0 ? "pending_review" : "assigned",
          submissions: formattedSubmissions
        });
      }
    }

    // Push notification to batch
    const uniqueBatchNames = [...new Set(Object.values(batchMap).map(b => b?.batch_name).filter(Boolean))];
    for (const bName of uniqueBatchNames) {
      await sendPushToBatch(bName, {
        title: "New Lecture Homework Assigned",
        body: `${schedule.subject}: ${lecture.homework.title}`,
        url: "/student/assignments"
      });
    }
  } catch (syncErr) {
    console.error("Error in syncScheduleLectureToHomework:", syncErr);
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

    // Auto sync to Homework collection so it appears in AssignTask & StudentAssignments
    if (title && title.trim()) {
      await syncScheduleLectureToHomework(schedule, lecture, userId);
    }

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

    if (files.notes_shared && files.notes_shared.length > 0) {
      response.notes_shared = files.notes_shared.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      }));
    }
    
    if (files.notes_teacher && files.notes_teacher.length > 0) {
      response.notes_teacher = files.notes_teacher.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      }));
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
      lecture.notes_shared = files.notes_shared.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      }));
    }

    // Process notes_teacher
    if (files.notes_teacher && files.notes_teacher.length > 0) {
      lecture.notes_teacher = files.notes_teacher.map(file => ({
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`
      }));
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
    } else if (role === "teacher") {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      const lecture = schedule.lectures.id(lectureId);
      const isPrimary = schedule.teacher?.toString() === userId;
      const isLectureTeacher = lecture?.teacher?.toString() === userId;
      if (!isPrimary && !isLectureTeacher) {
        return res.status(403).json({ message: "Access denied. You can only view submissions for your own lectures." });
      }
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
    const { fileName, fileUrl, submissionText } = req.body;
    const { id: userId, role } = req.user;

    if (role !== "student") {
      return res.status(403).json({ message: "Only students can submit homework." });
    }

    if (!fileName && !fileUrl && !submissionText) {
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

    // Sync to Homework collection
    try {
      const Homework = (await import("../models/homework.model.js")).default;
      let homework = await Homework.findOne({ lecture: lectureId, student: userId });
      const studentDoc = await Student.findById(userId).lean();

      if (!homework) {
        homework = await Homework.create({
          title: lecture.homework.title,
          description: lecture.homework.description || "",
          comment: lecture.homework.description || "",
          course: studentDoc?.course || "",
          semester: studentDoc?.semester || "",
          subject: null,
          subjectName: schedule.subject || "",
          dueDate: lecture.homework.due_date || lecture.date || new Date(),
          lecture: lectureId,
          student: userId,
          batch: schedule.batch || null,
          batchIds: schedule.batches && schedule.batches.length > 0 ? schedule.batches : (schedule.batch ? [schedule.batch] : []),
          batchName: studentDoc?.batch_name || "",
          batchNumber: studentDoc?.batch_no || "",
          assignedBy: schedule.teacher || null,
          status: "pending_review"
        });
      }

      const fileAtt = fileUrl ? [fileUrl] : [];
      homework.submissions.push({
        submissionText: submissionText || "",
        fileName: fileName || "attachment",
        fileUrl: fileUrl || "",
        attachments: fileAtt,
        submittedAt: new Date(),
        status: "pending_review"
      });
      homework.status = "pending_review";
      await homework.save();
    } catch (hwSyncErr) {
      console.error("Error syncing submission to Homework collection:", hwSyncErr);
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

    const filter = { schedule: scheduleId };

    // Role-based security validation
    if (role === "teacher") {
      const isPrimary = schedule.teacher?.toString() === userId;
      const myLectureIds = schedule.lectures
        .filter(l => l.teacher && l.teacher.toString() === userId)
        .map(l => l._id.toString());

      if (!isPrimary && myLectureIds.length === 0) {
        return res.status(403).json({ message: "Access denied. You can only view submissions for your own schedules." });
      }

      if (!isPrimary) {
        filter.lectureId = { $in: myLectureIds };
      }
    }

    const submissions = await Submission.find(filter)
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

/**
 * Teacher verifies or rejects an admin-created schedule
 * Role: Teacher only
 */
export const verifySchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "approve" | "reject"
    const { id: userId, role } = req.user;

    if (role !== "admin" && role !== "teacher") {
      return res.status(403).json({ message: "Access denied." });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Must be 'approve' or 'reject'." });
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    if (role === "teacher" && String(schedule.teacher) !== String(userId)) {
      return res.status(403).json({ message: "Access denied. This schedule is not assigned to you." });
    }

    if (action === "approve") {
      schedule.verificationStatus = "approved";
      await schedule.save();
      return res.status(200).json({ message: "Schedule verified and approved successfully." });
    } else {
      // On rejection, delete the schedule entirely so admin/teacher can recreate
      await Schedule.findByIdAndDelete(id);
      return res.status(200).json({ message: "Schedule rejected and removed." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Check for scheduling conflicts (batch + teacher double-booking)
 * Role: Admin, Teacher
 *
 * Body: {
 *   lectures: [{ index, date, time_slot, teacher, batchIds }]
 *   currentScheduleId?: string   // exclude this schedule when checking (for edit mode)
 * }
 *
 * Returns: { conflicts: [{ lectureIndex, type, conflictWith }] }
 */
export const checkConflicts = async (req, res) => {
  try {
    const { lectures, currentScheduleId, batchIds } = req.body;

    if (!lectures || !Array.isArray(lectures) || lectures.length === 0) {
      return res.status(400).json({ message: "lectures array is required." });
    }

    const conflicts = [];

    // Fetch all existing schedules (excluding current one in edit mode)
    const query = {};
    if (currentScheduleId) {
      query._id = { $ne: currentScheduleId };
    }

    const existingSchedules = await Schedule.find(query)
      .select("subject batch teacher lectures")
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name")
      .lean();

    for (const proposed of lectures) {
      const { index, date, time_slot, teacher: teacherIdRaw, batchIds: lecBatchIds, venue: proposedVenue } = proposed;

      if (!date || !time_slot) continue; // skip rows without date or time_slot

      const proposedTime = parseTimeSlot(time_slot);
      if (!proposedTime) continue;

      const proposedDate = new Date(date).toISOString().split("T")[0];
      const proposedTeacherId = typeof teacherIdRaw === "object"
        ? (teacherIdRaw?._id || "")
        : (teacherIdRaw || "");

      // Combine batch IDs: from the lecture itself or from the parent batchIds
      const proposedBatchIds = new Set([
        ...(lecBatchIds || []),
        ...(batchIds || [])
      ].map(String).filter(Boolean));

      for (const existing of existingSchedules) {
        const existingBatchId = existing.batch?._id?.toString() || existing.batch?.toString() || "";

        for (const exLec of existing.lectures || []) {
          if (!exLec.date || !exLec.time_slot) continue;

          const exTime = parseTimeSlot(exLec.time_slot);
          if (!exTime) continue;

          const exDate = new Date(exLec.date).toISOString().split("T")[0];
          if (exDate !== proposedDate) continue;
          if (!overlaps(proposedTime, exTime)) continue;

          // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Batch conflict Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
          if (proposedBatchIds.has(existingBatchId)) {
            conflicts.push({
              lectureIndex: index,
              type: "batch",
              conflictWith: {
                scheduleId: existing._id,
                subject: existing.subject,
                batchName: existing.batch?.batch_name,
                batchNo: existing.batch?.batch_no,
                existingTimeSlot: exLec.time_slot,
                existingDate: exDate,
                existingLectureTitle: exLec.title
              }
            });
          }

          // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Teacher conflict Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
          if (proposedTeacherId) {
            const exTeacherId = typeof exLec.teacher === "object"
              ? (exLec.teacher?._id?.toString() || "")
              : (exLec.teacher?.toString() || "");

            if (exTeacherId && exTeacherId === proposedTeacherId) {
              conflicts.push({
                lectureIndex: index,
                type: "teacher",
                conflictWith: {
                  scheduleId: existing._id,
                  subject: existing.subject,
                  batchName: existing.batch?.batch_name,
                  batchNo: existing.batch?.batch_no,
                  existingTimeSlot: exLec.time_slot,
                  existingDate: exDate,
                  existingLectureTitle: exLec.title
                }
              });
            }
          }

          // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Venue conflict Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
          if (proposedVenue && exLec.venue) {
            if (proposedVenue === exLec.venue) {
              conflicts.push({
                lectureIndex: index,
                type: "venue",
                conflictWith: {
                  scheduleId: existing._id,
                  subject: existing.subject,
                  batchName: existing.batch?.batch_name,
                  batchNo: existing.batch?.batch_no,
                  existingTimeSlot: exLec.time_slot,
                  existingDate: exDate,
                  existingVenue: exLec.venue,
                  existingLectureTitle: exLec.title
                }
              });
            }
          }
        }
      }
    }

    // Process Smart Venue Suggestions
    // For every venue conflict, we need to know what other venues are occupied
    const allVenues = ["Workspace 5", "Workspace 6", "Conference Room 1", "Conference Room 2", "Conference Room 3"];
    
    // Group conflicts by lectureIndex
    for (const c of conflicts) {
      if (c.type === "venue") {
        // Compute occupied venues for this lecture's proposed date & time
        const proposed = lectures.find(l => l.index === c.lectureIndex);
        if (proposed) {
          const proposedTime = parseTimeSlot(proposed.time_slot);
          const proposedDate = new Date(proposed.date).toISOString().split("T")[0];
          
          const occupiedVenues = new Set();
          for (const existing of existingSchedules) {
            for (const exLec of existing.lectures || []) {
              if (!exLec.date || !exLec.time_slot || !exLec.venue) continue;
              const exTime = parseTimeSlot(exLec.time_slot);
              if (!exTime) continue;
              const exDate = new Date(exLec.date).toISOString().split("T")[0];
              if (exDate !== proposedDate) continue;
              if (overlaps(proposedTime, exTime)) {
                occupiedVenues.add(exLec.venue);
              }
            }
          }
          const availableVenues = allVenues.filter(v => !occupiedVenues.has(v));
          c.availableVenues = availableVenues;
        }
      }
    }

    // Deduplicate: same lectureIndex + same type + same scheduleId
    const seen = new Set();
    const unique = conflicts.filter(c => {
      const key = `${c.lectureIndex}_${c.type}_${c.conflictWith.scheduleId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.status(200).json({ conflicts: unique });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Transfer a scheduled lecture to another teacher
 * Role: Admin, Teacher (only their own lectures)
 */
export const transferLecture = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { newTeacherId, reason } = req.body;
    const { role, id: userId } = req.user;

    if (!newTeacherId) {
      return res.status(400).json({ message: "New teacher ID is required." });
    }

    if (scheduleId.startsWith("batch_syllabus_")) {
      const bl = await BatchLecture.findById(lectureId);
      if (!bl) {
        return res.status(404).json({ message: "Lecture not found." });
      }

      const currentTeacherId = String(bl.assignedTo);
      if (role === "teacher" && currentTeacherId !== String(userId)) {
        return res.status(403).json({ message: "Access denied. You can only transfer your own lectures." });
      }

      if (currentTeacherId === String(newTeacherId)) {
        return res.status(400).json({ message: "Lecture is already assigned to this teacher." });
      }

      if (!bl.isTransferred) {
        bl.originalTeacher = currentTeacherId;
      }

      bl.transferHistory.push({
        oldTeacher: currentTeacherId,
        newTeacher: newTeacherId,
        date: new Date(),
        reason: reason || ""
      });

      bl.assignedTo = newTeacherId;
      bl.isTransferred = true;

      await bl.save();

      return res.status(200).json({ message: "Lecture transferred successfully." });
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found." });
    }

    // Determine current teacher of the lecture
    const currentTeacherId = String(lecture.teacher || schedule.teacher);

    // Permission check for teacher
    if (role === "teacher" && currentTeacherId !== String(userId)) {
      return res.status(403).json({ message: "Access denied. You can only transfer your own lectures." });
    }

    if (currentTeacherId === String(newTeacherId)) {
      return res.status(400).json({ message: "Lecture is already assigned to this teacher." });
    }

    // Teacher Conflict Validation (Double Booking Check)
    const proposedLectures = [{
      date: lecture.date,
      time_slot: lecture.time_slot,
      teacherIdRaw: newTeacherId,
      currentLectureId: lecture._id
    }];
    
    const conflictCheck = await validateTeacherConflicts(proposedLectures);
    if (conflictCheck.hasConflict) {
      return res.status(409).json({
        message: "This teacher is already assigned to another lecture during the selected date and time. Please select another teacher or choose a different time slot.",
        conflictDetails: conflictCheck.conflictDetails
      });
    }
    // Set originalTeacher if not already set (i.e. first transfer)
    if (!lecture.isTransferred) {
      lecture.originalTeacher = currentTeacherId;
    }
    
    // Add to history
    lecture.transferHistory.push({
      originalTeacher: currentTeacherId,
      newTeacher: newTeacherId,
      transferredBy: userId,
      transferredByRole: role,
      transferredAt: new Date(),
      reason: reason || ""
    });

    // Update assignment
    lecture.teacher = newTeacherId;
    lecture.isTransferred = true;

    await schedule.save();

    return res.status(200).json({ message: "Lecture transferred successfully." });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const checkVenueAvailability = async (req, res) => {
  try {
    const { date, time_slot, currentLectureId } = req.body;

    if (!date || !time_slot) {
      return res.status(400).json({ message: "Date and time_slot are required." });
    }

    const proposedTime = parseTimeSlot(time_slot);
    if (!proposedTime) {
      return res.status(400).json({ message: "Invalid time_slot format." });
    }

    const proposedDate = new Date(date).toISOString().split("T")[0];

    const existingSchedules = await Schedule.find({
      "lectures.date": {
        $gte: new Date(proposedDate),
        $lte: new Date(new Date(proposedDate).getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate("teacher", "name").lean();

    const occupiedVenues = [];

    for (const existing of existingSchedules) {
      for (const exLec of existing.lectures || []) {
        if (currentLectureId && String(exLec._id) === currentLectureId) continue;
        if (!exLec.date || !exLec.time_slot || !exLec.venue) continue;

        const exTime = parseTimeSlot(exLec.time_slot);
        if (!exTime) continue;

        const exDate = new Date(exLec.date).toISOString().split("T")[0];
        if (exDate !== proposedDate) continue;

        if (overlaps(proposedTime, exTime)) {
          occupiedVenues.push({
            venue: exLec.venue,
            subject: existing.subject,
            teacherName: exLec.teacher?.name || existing.teacher?.name || "Unknown",
            time_slot: exLec.time_slot
          });
        }
      }
    }

    return res.status(200).json({ occupiedVenues });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateLectureVenue = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { newVenue, reason } = req.body;
    const { id: userId, role } = req.user;

    if (!newVenue) {
      return res.status(400).json({ message: "newVenue is required." });
    }

    if (scheduleId.startsWith("batch_syllabus_") || scheduleId.startsWith("syllabus_")) {
      const bl = await BatchLecture.findById(lectureId);
      if (!bl) {
        return res.status(404).json({ message: "Lecture not found." });
      }

      const currentTeacherId = String(bl.assignedTo);
      if (role === "teacher" && currentTeacherId !== String(userId)) {
        return res.status(403).json({ message: "Access denied. You can only change venue for your own lectures." });
      }

      if (bl.venue === newVenue) {
        return res.status(400).json({ message: "Lecture is already assigned to this venue." });
      }
      
      if (!bl.venueHistory) {
        bl.venueHistory = [];
      }
      bl.venueHistory.push({
        oldVenue: bl.venue || "",
        newVenue: newVenue,
        changedBy: userId,
        changedByRole: role,
        changedAt: new Date(),
        reason: reason || ""
      });

      bl.venue = newVenue;
      await bl.save();

      return res.status(200).json({ message: "Lecture venue updated successfully.", lecture: bl });
    }

    const schedule = await Schedule.findById(scheduleId).populate("teacher", "name");
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found." });
    }

    const currentTeacherId = String(lecture.teacher || schedule.teacher._id);
    if (role === "teacher" && currentTeacherId !== String(userId)) {
      return res.status(403).json({ message: "Access denied. You can only change venue for your own lectures." });
    }

    if (lecture.venue === newVenue) {
      return res.status(400).json({ message: "Lecture is already assigned to this venue." });
    }

    const proposedTime = parseTimeSlot(lecture.time_slot);
    if (proposedTime && lecture.date) {
      const proposedDate = new Date(lecture.date).toISOString().split("T")[0];

      const existingSchedules = await Schedule.find({
        "lectures.date": {
          $gte: new Date(proposedDate),
          $lte: new Date(new Date(proposedDate).getTime() + 24 * 60 * 60 * 1000)
        }
      }).lean();

      for (const existing of existingSchedules) {
        for (const exLec of existing.lectures || []) {
          if (String(existing._id) === scheduleId && String(exLec._id) === lectureId) continue;
          if (!exLec.date || !exLec.time_slot || exLec.venue !== newVenue) continue;

          const exTime = parseTimeSlot(exLec.time_slot);
          if (!exTime) continue;

          const exDate = new Date(exLec.date).toISOString().split("T")[0];
          if (exDate !== proposedDate) continue;

          if (overlaps(proposedTime, exTime)) {
            return res.status(409).json({
              message: "This venue is already booked for another lecture during the selected date and time. Please select another available venue."
            });
          }
        }
      }
    }

    if (!lecture.venueHistory) {
      lecture.venueHistory = [];
    }
    
    lecture.venueHistory.push({
      oldVenue: lecture.venue || "",
      newVenue: newVenue,
      changedBy: userId,
      changedByRole: role,
      changedAt: new Date(),
      reason: reason || ""
    });

    lecture.venue = newVenue;
    await schedule.save();

    return res.status(200).json({ message: "Lecture venue updated successfully.", lecture });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};







export const deleteLecture = async (req, res) => {
  try {
    const { scheduleId, lectureId } = req.params;
    const { id: userId, role } = req.user;

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "This lecture has already been deleted. Please refresh the page." });
    }

    const lecture = schedule.lectures.id(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "This lecture has already been deleted. Please refresh the page." });
    }

    // Role check: Only admin or the assigned teacher
    if (role === "teacher") {
      const isLectureTeacher = String(lecture.teacher) === String(userId);
      const isScheduleTeacher = String(schedule.teacher) === String(userId);
      if (!isLectureTeacher && !isScheduleTeacher) {
        return res.status(403).json({ message: "Access denied. You can only delete your own assigned lectures." });
      }
    }

    // Remove lecture
    schedule.lectures.pull(lectureId);

    // If no lectures remain, delete the entire schedule document to avoid orphans
    if (schedule.lectures.length === 0) {
      await Schedule.findByIdAndDelete(scheduleId);
    } else {
      await schedule.save();
    }

    return res.status(200).json({ message: "Lecture deleted successfully." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
