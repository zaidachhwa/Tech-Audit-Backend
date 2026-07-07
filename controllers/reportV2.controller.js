import Homework from "../models/homework.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { Syllabus } from "../models/syllabus.model.js";

export const getHomeworkReport = async (req, res) => {
  try {
    const totalHomework = await Homework.countDocuments();
    const approvedHomework = await Homework.countDocuments({ status: "Approved" });
    const pendingHomework = await Homework.countDocuments({ status: "Pending Approval" });
    const submittedHomework = await Homework.countDocuments({ status: "Submitted" });

    res.json({
      totalHomework,
      approvedHomework,
      pendingHomework,
      submittedHomework,
      submissionRate: totalHomework > 0 ? Math.round(((approvedHomework + submittedHomework) / totalHomework) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLectureReport = async (req, res) => {
  try {
    const totalLectures = await BatchLecture.countDocuments();
    const completedLectures = await BatchLecture.countDocuments({ completionStatus: "Completed" });
    const inProgressLectures = await BatchLecture.countDocuments({ completionStatus: "In Progress" });
    const pendingLectures = await BatchLecture.countDocuments({ completionStatus: "Pending" });

    res.json({
      totalLectures,
      completedLectures,
      inProgressLectures,
      pendingLectures,
      completionRate: totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTeacherReport = async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments();
    const activeTeachers = await Teacher.countDocuments({ isActive: true });

    // Aggregate lectures per teacher
    const lecturesPerTeacher = await BatchLecture.aggregate([
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } }
    ]);

    res.json({
      totalTeachers,
      activeTeachers,
      lecturesAssigned: lecturesPerTeacher
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentReport = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });

    // Aggregate submissions per student
    const homeworkSubmissions = await Homework.aggregate([
      { $group: { _id: "$student", submissions: { $sum: { $cond: [{ $ne: ["$status", "Assigned"] }, 1, 0] } } }}
    ]);

    res.json({
      totalStudents,
      activeStudents,
      submissionsSummary: homeworkSubmissions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
