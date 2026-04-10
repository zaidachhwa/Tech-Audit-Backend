import { Announcement } from "../models/announcement.model.js";
import { Student } from "../models/student.model.js";

export const createAnnouncement = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, message, batch, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const announcement = await Announcement.create({
      teacher: teacherId,
      title,
      message,
      batch: batch || "All Batches",
      priority: priority || "info",
    });

    res.status(201).json({ message: "Announcement created", announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAnnouncement = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const announcements = await Announcement.find({ teacher: teacherId })
      .sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const announcement = await Announcement.findOne({ _id: id, teacher: teacherId });
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
      $or: [
        { batch: student.batch_name },
        { batch: "All Batches" }
      ]
    })
    .populate("teacher", "name profilePhoto")
    .sort({ createdAt: -1 });

    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
