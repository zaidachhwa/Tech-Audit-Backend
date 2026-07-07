import { Lecture } from "../models/lecture.model.js";

export const createReference = async (req, res) => {
  try {
    const { lectureId, title, description } = req.body;
    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    const lecture = await Lecture.create({
      title,
      description: description || "",
      lectureType: "Reference",
      syllabus: lectureId || null // support linking
    });

    res.status(201).json({ message: "Reference lecture created successfully", lecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getReferences = async (req, res) => {
  try {
    const lectures = await Lecture.find({ lectureType: "Reference" })
      .populate("syllabus", "subject description");
    res.json(lectures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateReference = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Lecture.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Reference lecture not found" });
    }
    res.json({ message: "Reference lecture updated", lecture: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteReference = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Lecture.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Reference lecture not found" });
    }
    res.json({ message: "Reference lecture deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
