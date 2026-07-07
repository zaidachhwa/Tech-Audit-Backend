import ActivityLog from "../models/activityLog.model.js";

export const logActivity = async (req, action, details = "") => {
  try {
    const logData = {
      action,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress || ""
    };

    if (req.user) {
      logData.user = req.user.id;
      // Capitalize first letter of role to match model names
      logData.onModel = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);
    }

    await ActivityLog.create(logData);
  } catch (err) {
    console.error("Activity logging failed:", err.message);
  }
};
