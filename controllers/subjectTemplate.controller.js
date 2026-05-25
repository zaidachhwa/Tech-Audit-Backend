import { SubjectTemplate } from "../models/subjectTemplate.model.js";

/**
 * Get all Subject Templates
 * Role: Admin, Teacher
 */
export const getSubjectTemplates = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query = {};
    if (role === "teacher") {
      query = {
        $or: [
          { status: "approved" },
          { status: { $exists: false } },
          { teacher: userId },
          { createdBy: userId }
        ]
      };
    }
    const templates = await SubjectTemplate.find(query)
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json(templates);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Create or Update Subject Template
 * Role: Admin, Teacher (creates request)
 */
export const saveSubjectTemplate = async (req, res) => {
  try {
    const { name, lectures, teacher } = req.body;
    const { id: userId, role } = req.user;

    if (role !== "admin" && role !== "teacher") {
      return res.status(403).json({ message: "Access denied." });
    }

    if (!name) {
      return res.status(400).json({ message: "Subject name is required." });
    }

    let template = await SubjectTemplate.findOne({ name });
    
    if (template) {
      if (role !== "admin" && String(template.createdBy) !== String(userId)) {
        return res.status(403).json({ message: "A subject template with this name already exists." });
      }

      template.lectures = lectures || [];
      if (role === "admin") {
        if (teacher) template.teacher = teacher;
      } else {
        template.teacher = userId;
        template.status = "pending"; // reset to pending if updating
      }
      await template.save();
    } else {
      template = await SubjectTemplate.create({
        name,
        teacher: role === "teacher" ? userId : (teacher || null),
        lectures: lectures || [],
        createdBy: userId,
        createdByModel: role === "admin" ? "Admin" : "Teacher",
        status: role === "admin" ? "approved" : "pending"
      });
    }

    return res.status(200).json({
      message: role === "admin" ? "Subject template saved successfully" : "Subject creation request submitted to admin for approval",
      template
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Subject Template
 * Role: Admin, Teacher (only for their pending/rejected requests)
 */
export const deleteSubjectTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const template = await SubjectTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: "Subject template not found." });
    }

    if (role !== "admin") {
      if (role === "teacher" && (String(template.createdBy) === String(userId) || String(template.teacher) === String(userId))) {
        if (template.status === "approved") {
          return res.status(403).json({ message: "Only admins can delete approved templates." });
        }
      } else {
        return res.status(403).json({ message: "Access denied." });
      }
    }

    await SubjectTemplate.findByIdAndDelete(id);
    return res.status(200).json({ message: "Subject template deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Approve or Disapprove Subject Template Request
 * Role: Admin
 */
export const updateSubjectTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can approve or reject subject templates." });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'." });
    }

    const template = await SubjectTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ message: "Subject template not found." });
    }

    template.status = status;
    await template.save();

    return res.status(200).json({
      message: `Subject template status updated to '${status}' successfully.`,
      template
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
