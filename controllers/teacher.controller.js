import { Teacher } from "../models/teacher.model.js";

export const approveTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = true;
    await teacher.save();
    res.json({ message: "Teacher approved", teacher });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const rejectTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.isActive = false;
    await teacher.save();
    res.json({ message: "Teacher rejected", teacher });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
