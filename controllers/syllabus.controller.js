import { Syllabus } from "../models/syllabus.model.js";
import { Topic } from "../models/topic.model.js";
import { Teacher } from "../models/teacher.model.js";

// ADMIN: Create a syllabus
export const createSyllabus = async (req, res) => {
  try {
    const { subject, description } = req.body;

    const syllabus = await Syllabus.create({
      subject,
      description,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: "Syllabus created", syllabus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: Add topic inside a syllabus
export const addTopic = async (req, res) => {
  try {
    const { syllabusId, title, description, dueDate } = req.body;

    const topic = await Topic.create({
      syllabus: syllabusId,
      title,
      description,
      dueDate,
    });

    await Syllabus.findByIdAndUpdate(syllabusId, {
      $push: { topics: topic._id },
    });

    res.status(201).json({ message: "Topic added", topic });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: Assign topic
export const assignTopicToTeacher = async (req, res) => {
  try {
    const { topicId, teacherId } = req.body;

    await Topic.findByIdAndUpdate(topicId, { assignedTo: teacherId });
    await Syllabus.updateOne(
      { topics: topicId },
      { $addToSet: { assignedTeachers: teacherId } }
    );

    res.json({ message: "Topic assigned to teacher" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TEACHER: View your topics
export const getTeacherTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ assignedTo: req.user.id }).populate(
      "syllabus"
    );
    res.json({ topics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TEACHER: Mark complete
export const markTopicCompleted = async (req, res) => {
  try {
    const { topicId } = req.params;

    await Topic.findByIdAndUpdate(topicId, {
      completionStatus: "Completed",
      completedAt: new Date(),
    });

    res.json({ message: "Topic marked as completed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TEACHER: Add remark
export const addTopicRemark = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { remark } = req.body;

    await Topic.findByIdAndUpdate(topicId, {
      remarks: remark,
    });

    res.json({ message: "Remark added" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ADMIN: Get syllabus progress
export const getSyllabusWithProgress = async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.syllabusId)
      .populate("topics")
      .populate("assignedTeachers", "name email");

    res.json({ syllabus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all syllabi (admin)
export const getAllSyllabi = async (req, res) => {
  try {
    const syllabi = await Syllabus.find()
      .populate("topics")
      .populate("assignedTeachers", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ syllabi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
