import Chapter from "../models/chapter.model.js";

export const createChapter = async (req, res) => {
  try {
    const { subjectId, title, order } = req.body;
    if (!subjectId || !title) {
      return res.status(400).json({ message: "subjectId and title are required" });
    }
    const chapter = await Chapter.create({
      subjectId,
      title,
      order: Number(order) || 0
    });
    res.status(201).json({ message: "Chapter created successfully", chapter });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getChapters = async (req, res) => {
  try {
    const { subjectId } = req.query;
    const filter = {};
    if (subjectId) filter.subjectId = subjectId;

    const chapters = await Chapter.find(filter)
      .populate("subjectId", "subject description")
      .sort({ order: 1, createdAt: 1 });
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Chapter.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json({ message: "Chapter updated successfully", chapter: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Chapter.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    res.json({ message: "Chapter deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
