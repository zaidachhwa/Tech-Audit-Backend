import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { LecturePunchLog } from "../models/lecturePunchLog.model.js";

/**
 * Get upcoming and active scheduled lectures for a teacher
 */
export const getTeacherUpcomingLectures = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // 1. Fetch Schedule documents where teacher is assigned
    const schedules = await Schedule.find({
      $or: [{ teacher: teacherId }, { "lectures.teacher": teacherId }],
    })
      .populate("batch", "batch_name batch_no")
      .populate("teacher", "name email")
      .lean();

    const upcomingList = [];

    schedules.forEach((sch) => {
      (sch.lectures || []).forEach((lec) => {
        const isAssigned =
          String(sch.teacher?._id || sch.teacher) === String(teacherId) ||
          (lec.teacher && String(lec.teacher?._id || lec.teacher) === String(teacherId));

        if (isAssigned) {
            const finalBatches = sch.batches?.length > 0 ? sch.batches : (sch.batch ? [sch.batch] : []);
            const batchNameString = finalBatches.length > 0 ? finalBatches.map(b => b.batch_name || "").filter(Boolean).join(", ") : "N/A";
            
            upcomingList.push({
              _id: String(lec._id),
              scheduleId: String(sch._id),
              batchLectureId: null,
              title: lec.title || "Untitled Lecture",
              topicId: String(lec.topicId || ""),
              topicName: lec.topicName || "",
              subject: sch.subject || "Subject",
              batch: { batch_name: batchNameString, batch_no: "" },
            date: lec.date,
            time_slot: lec.time_slot || "",
            status: lec.status || "Scheduled",
            punchStatus: lec.punchStatus || "PENDING",
            punchInTime: lec.punchInTime || null,
            punchOutTime: lec.punchOutTime || null,
            punchInNotes: lec.punchInNotes || "",
            punchOutNotes: lec.punchOutNotes || "",
            punchInFile: lec.punchInFile || null,
            punchOutFile: lec.punchOutFile || null,
          });
        }
      });
    });

    // 2. Fetch scheduled BatchLectures
    const batchLectures = await BatchLecture.find({
      $or: [{ assignedTo: teacherId }, { teacherIds: teacherId }],
      dueDate: { $exists: true, $ne: null },
    })
      .populate("batch", "batch_name batch_no")
      .populate("syllabus", "subject name")
      .lean();

    batchLectures.forEach((bl) => {
      // Prevent duplicates if already present from schedule
      const duplicate = upcomingList.some(
        (item) => item.title === bl.title && String(item.batch?._id) === String(bl.batch?._id)
      );

      if (!duplicate) {
        upcomingList.push({
          _id: String(bl._id),
          scheduleId: null,
          batchLectureId: String(bl._id),
          title: bl.title || "Untitled Lecture",
          topicId: String(bl.templateLecture || ""),
          topicName: bl.title || "",
          subject: bl.syllabus?.subject || bl.syllabus?.name || "Subject",
          batch: bl.batch || { batch_name: "N/A", batch_no: "" },
          date: bl.dueDate,
          time_slot: bl.remarks ? bl.remarks : "",
          status: bl.completionStatus === "Completed" ? "Done" : "Scheduled",
          punchStatus: bl.punchStatus || "PENDING",
          punchInTime: bl.punchInTime || null,
          punchOutTime: bl.punchOutTime || null,
          punchInNotes: bl.punchInNotes || "",
          punchOutNotes: bl.punchOutNotes || "",
          punchInFile: bl.punchInFile || null,
          punchOutFile: bl.punchOutFile || null,
        });
      }
    });

    // Sort by date ascending (closest lectures first)
    upcomingList.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json(upcomingList);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Punch In to a scheduled lecture
 */
export const punchInLecture = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { scheduleId, lectureId, batchLectureId, punchInNotes } = req.body;

    if (!punchInNotes || !punchInNotes.trim()) {
      return res.status(400).json({
        message: "Please specify what you are going to teach in this lecture before punching in.",
      });
    }

    let fileData = { fileName: "", fileUrl: "" };
    if (req.file) {
      fileData = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
      };
    }

    const now = new Date();
    let lectureTitle = "";
    let subject = "";
    let batchId = null;
    let scheduledDate = now;
    let timeSlot = "";

    if (scheduleId) {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Lecture Schedule not found." });
      }

      const lec = schedule.lectures.id(lectureId);
      if (!lec) {
        return res.status(404).json({ message: "Lecture not found in schedule." });
      }

      lec.punchInTime = now;
      lec.punchInNotes = punchInNotes.trim();
      if (fileData.fileUrl) lec.punchInFile = fileData;
      lec.punchStatus = "PUNCHED_IN";
      lec.status = "Scheduled";

      await schedule.save();

      lectureTitle = lec.title;
      subject = schedule.subject;
      batchId = schedule.batches && schedule.batches.length > 0 ? schedule.batches[0] : schedule.batch;
      scheduledDate = lec.date;
      timeSlot = lec.time_slot || "";
    } else if (batchLectureId) {
      const bl = await BatchLecture.findById(batchLectureId).populate("syllabus", "subject name");
      if (!bl) {
        return res.status(404).json({ message: "Batch Lecture not found." });
      }

      bl.punchInTime = now;
      bl.punchInNotes = punchInNotes.trim();
      if (fileData.fileUrl) bl.punchInFile = fileData;
      bl.punchStatus = "PUNCHED_IN";
      bl.completionStatus = "In Progress";

      await bl.save();

      lectureTitle = bl.title;
      subject = bl.syllabus?.subject || bl.syllabus?.name || "Subject";
      batchId = bl.batch;
      scheduledDate = bl.dueDate || now;
      timeSlot = bl.remarks || "";
    } else {
      return res.status(400).json({ message: "Schedule ID or Batch Lecture ID is required." });
    }

    // Upsert into LecturePunchLog
    const punchLog = await LecturePunchLog.create({
      scheduleId: scheduleId || null,
      batchLectureId: batchLectureId || null,
      lectureId: lectureId || batchLectureId,
      lectureTitle,
      subject,
      batch: batchId,
      teacher: teacherId,
      scheduledDate,
      scheduledTimeSlot: timeSlot,
      punchInTime: now,
      punchInNotes: punchInNotes.trim(),
      punchInFile: fileData,
      status: "PUNCHED_IN",
    });

    return res.status(200).json({
      message: "Punched In successfully!",
      punchLog,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Punch Out of a scheduled lecture
 */
export const punchOutLecture = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { scheduleId, lectureId, batchLectureId, punchOutNotes } = req.body;

    if (!punchOutNotes || !punchOutNotes.trim()) {
      return res.status(400).json({
        message: "Please specify what was taught in this lecture before punching out.",
      });
    }

    let fileData = { fileName: "", fileUrl: "" };
    if (req.file) {
      fileData = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/${req.file.filename}`,
      };
    }

    const now = new Date();

    if (scheduleId) {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Lecture Schedule not found." });
      }

      const lec = schedule.lectures.id(lectureId);
      if (!lec) {
        return res.status(404).json({ message: "Lecture not found in schedule." });
      }

      lec.punchOutTime = now;
      lec.punchOutNotes = punchOutNotes.trim();
      if (fileData.fileUrl) lec.punchOutFile = fileData;
      lec.punchStatus = "PUNCHED_OUT";
      lec.status = "Done";

      await schedule.save();
    } else if (batchLectureId) {
      const bl = await BatchLecture.findById(batchLectureId);
      if (!bl) {
        return res.status(404).json({ message: "Batch Lecture not found." });
      }

      bl.punchOutTime = now;
      bl.punchOutNotes = punchOutNotes.trim();
      if (fileData.fileUrl) bl.punchOutFile = fileData;
      bl.punchStatus = "PUNCHED_OUT";
      bl.completionStatus = "Completed";
      bl.completedAt = now;

      await bl.save();
    } else {
      return res.status(400).json({ message: "Schedule ID or Batch Lecture ID is required." });
    }

    // Update existing LecturePunchLog
    const targetLectureId = lectureId || batchLectureId;
    let punchLog = await LecturePunchLog.findOne({
      lectureId: targetLectureId,
      teacher: teacherId,
    }).sort({ createdAt: -1 });

    if (punchLog) {
      punchLog.punchOutTime = now;
      punchLog.punchOutNotes = punchOutNotes.trim();
      if (fileData.fileUrl) punchLog.punchOutFile = fileData;
      punchLog.status = "PUNCHED_OUT";
      await punchLog.save();
    } else {
      punchLog = await LecturePunchLog.create({
        scheduleId: scheduleId || null,
        batchLectureId: batchLectureId || null,
        lectureId: targetLectureId,
        teacher: teacherId,
        punchOutTime: now,
        punchOutNotes: punchOutNotes.trim(),
        punchOutFile: fileData,
        status: "PUNCHED_OUT",
      });
    }

    return res.status(200).json({
      message: "Punched Out successfully!",
      punchLog,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get Punch Logs (Teacher sees own logs; Admin sees all logs)
 */
export const getPunchLogs = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { teacherId, batchId, status, startDate, endDate } = req.query;

    let query = {};

    if (role === "teacher") {
      query.teacher = userId;
    } else if (teacherId && teacherId !== "all") {
      query.teacher = teacherId;
    }

    if (batchId && batchId !== "all") {
      query.batch = batchId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // Date Filtering (checks scheduledDate or punchInTime or createdAt)
    if (startDate || endDate) {
      query.$or = [];
      const dateCond = {};
      if (startDate) {
        dateCond.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateCond.$lte = end;
      }

      query.$or = [
        { scheduledDate: dateCond },
        { punchInTime: dateCond },
        { createdAt: dateCond },
      ];
    }

    const logs = await LecturePunchLog.find(query)
      .populate("teacher", "name email designation")
      .populate("batch", "batch_name batch_no")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update Lecture Title and Topic
 */
export const updateLectureTopic = async (req, res) => {
  try {
    const { scheduleId, lectureId, batchLectureId, title, topicId, topicName } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Lecture Title is required." });
    }
    if (!topicId) {
      return res.status(400).json({ message: "Topic selection is required." });
    }

    if (scheduleId && lectureId) {
      const schedule = await Schedule.findById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found." });
      }

      const lec = schedule.lectures.id(lectureId);
      if (!lec) {
        return res.status(404).json({ message: "Lecture not found in schedule." });
      }

      lec.title = title.trim();
      lec.topicId = topicId;
      lec.topicName = topicName || "";

      await schedule.save();

      // Optionally update LecturePunchLog if it already exists
      await LecturePunchLog.updateMany(
        { lectureId },
        { $set: { lectureTitle: title.trim(), subject: schedule.subject } }
      );

      return res.status(200).json({ message: "Lecture details updated successfully.", lecture: lec });
    } else if (batchLectureId) {
      const bl = await BatchLecture.findById(batchLectureId).populate("syllabus", "subject name");
      if (!bl) {
        return res.status(404).json({ message: "Batch Lecture not found." });
      }

      bl.title = title.trim();
      bl.templateLecture = topicId; // Use templateLecture for BatchLecture topics

      await bl.save();

      await LecturePunchLog.updateMany(
        { batchLectureId },
        { $set: { lectureTitle: title.trim(), subject: bl.syllabus?.subject || bl.syllabus?.name || "Subject" } }
      );

      return res.status(200).json({ message: "Batch lecture details updated successfully.", lecture: bl });
    } else {
      return res.status(400).json({ message: "Schedule ID + Lecture ID or Batch Lecture ID is required." });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

