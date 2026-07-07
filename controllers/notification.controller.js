import Notification from "../models/notification.model.js";

export const createNotification = async (req, res) => {
  try {
    const { userId, userModel, title, message, type } = req.body;
    if (!userId || !userModel || !title || !message) {
      return res.status(400).json({ message: "userId, userModel, title, and message are required" });
    }
    const notification = await Notification.create({
      user: userId,
      userModel,
      title,
      message,
      type: type || "General"
    });
    res.status(201).json({ message: "Notification created", notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const filter = {};
    if (req.user) {
      filter.user = req.user.id;
    }
    const list = await Notification.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked read", notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
