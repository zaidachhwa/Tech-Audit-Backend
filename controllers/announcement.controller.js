import { Announcement } from "../models/announcement.model.js";

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

export const getAnnouncements = async (req, res) => {
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