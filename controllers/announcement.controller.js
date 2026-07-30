import { Announcement } from "../models/announcement.model.js";
import { Student } from "../models/student.model.js";
import { sendPushToBatch } from "../services/pushNotification.service.js";
import { notifyParents } from "../services/parentNotification.service.js";

export const createAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { title, message, batch, priority, targetAudience, targetTeacher } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const payload = {
      title,
      message,
      batch: batch || "All Batches",
      priority: priority || "info",
      targetAudience: targetAudience || "Students",
      targetTeacher: targetTeacher || null
    };
    if (role === "teacher") {
      payload.teacher = userId;
    } else if (role === "admin") {
      payload.admin = userId;
    }

    const announcement = await Announcement.create(payload);

    if (payload.targetAudience === "Students" || payload.targetAudience === "Both") {
      // Notify students in the batch
      if (batch && batch !== "All Batches") {
        await sendPushToBatch(batch, {
          title: `New Announcement: ${title}`,
          body: message,
          url: "/student/announcements"
        });
        
        // Notify parents in the batch
        import("../models/batch.model.js").then(async ({ default: Batch }) => {
          const b = await Batch.findById(batch).lean();
          if (b && b.students && b.students.length > 0) {
            await notifyParents(b.students, `New Announcement: ${title}`, message);
          }
        }).catch(console.error);
      } else {
        // All Batches
        import("../models/student.model.js").then(async ({ Student: StudentModel }) => {
          const allStudents = await StudentModel.find({ isActive: true }).select("_id").lean();
          const studentIds = allStudents.map(s => s._id);
          if (studentIds.length > 0) {
            await notifyParents(studentIds, `New Announcement: ${title}`, message);
          }
        }).catch(console.error);
      }
    } 
    
    if (payload.targetAudience === "Teachers" || payload.targetAudience === "Both") {
      // If a specific teacher is targeted, notify them directly. 
      // If targetTeacher is not provided, we could notify all teachers, but maybe we don't have a "sendPushToAllTeachers" method. 
      // Assuming sendPushToUser works for single users.
      if (payload.targetTeacher) {
        import("../services/pushNotification.service.js").then(({ sendPushToUser }) => {
          sendPushToUser(payload.targetTeacher, "Teacher", {
             title: `New Announcement: ${title}`,
             body: message,
             url: "/teacher/announcements"
          }).catch(console.error);
        });
      }
    }

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    let announcements;
    
    if (role === "teacher") {
      // Teachers see announcements they created, AND announcements targeted at them (or all teachers)
      announcements = await Announcement.find({
        $or: [
          { teacher: userId },
          { targetAudience: "Teachers", targetTeacher: userId },
          { targetAudience: "Teachers", targetTeacher: { $exists: false } },
          { targetAudience: "Teachers", targetTeacher: null },
          { targetAudience: "Both" }
        ]
      })
      .populate("admin", "name profilePhoto")
      .sort({ createdAt: -1 });
    } else if (role === "admin") {
      announcements = await Announcement.find({ admin: userId })
        .populate("teacher", "name profilePhoto")
        .populate("targetTeacher", "name profilePhoto")
        .sort({ createdAt: -1 });
    }
    
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { id } = req.params;

    let filter = { _id: id };
    if (role === "teacher") {
      filter.teacher = userId;
    } else if (role === "admin") {
      filter.admin = userId;
    }

    const announcement = await Announcement.findOne(filter);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await Announcement.findByIdAndDelete(id);
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentAnnouncements = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);
    
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const announcements = await Announcement.find({
      $and: [
        {
          $or: [
            { targetAudience: "Students" },
            { targetAudience: "Both" }
          ]
        },
        {
          $or: [
            { batch: student.batch_name },
            { batch: "All Batches" }
          ]
        }
      ]
    })
    .populate("teacher", "name profilePhoto")
    .populate("admin", "name profilePhoto")
    .sort({ createdAt: -1 });

    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
