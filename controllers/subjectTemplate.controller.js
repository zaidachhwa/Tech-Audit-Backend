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
      query.$or = [{ teacher: userId }, { teacher: null }, { teacher: { $exists: false } }];
    }
    const templates = await SubjectTemplate.find(query).sort({ createdAt: -1 });
    return res.status(200).json(templates);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Create or Update Subject Template
 * Role: Admin
 */
export const saveSubjectTemplate = async (req, res) => {
  try {
    const { name, lectures, teacher } = req.body;
    const { id: userId, role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can save subject templates." });
    }

    if (!name) {
      return res.status(400).json({ message: "Subject name is required." });
    }

    // Upsert logic: if it exists by name, update lectures. If not, create.
    let template = await SubjectTemplate.findOne({ name });
    
    if (template) {
      template.lectures = lectures || [];
      if (teacher) template.teacher = teacher;
      await template.save();
    } else {
      template = await SubjectTemplate.create({
        name,
        teacher: teacher || null,
        lectures: lectures || [],
        createdBy: userId
      });
    }

    return res.status(200).json({
      message: "Subject template saved successfully",
      template
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete Subject Template
 * Role: Admin
 */
export const deleteSubjectTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    if (role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete subject templates." });
    }

    await SubjectTemplate.findByIdAndDelete(id);
    return res.status(200).json({ message: "Subject template deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
