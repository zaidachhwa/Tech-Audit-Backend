import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Syllabus } from "../models/syllabus.model.js";
import Batch from "../models/batch.model.js";
import { Lecture } from "../models/lecture.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import Homework from "../models/homework.model.js";
import { Attendance } from "../models/attendance.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";

export const getAdminDashboard = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalSubjects = await Syllabus.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const totalLectures = await Lecture.countDocuments({ lectureType: "Normal" });
    const pendingHomework = await Homework.countDocuments({ status: "Pending Approval" });
    const completedLectures = await BatchLecture.countDocuments({ completionStatus: "Completed" });

    // Calculate overall average subject progress
    const lectures = await BatchLecture.find({ lectureType: "Normal" });
    const total = lectures.length;
    const completed = lectures.filter((l) => l.completionStatus === "Completed").length;
    const subjectProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      totalStudents,
      totalTeachers,
      totalSubjects,
      totalBatches,
      totalLectures,
      pendingHomework,
      completedLectures,
      subjectProgress
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;

    // Today's lectures (assigned to this teacher)
    const todayLectures = await BatchLecture.find({
      $or: [{ assignedTo: teacherId }, { teacherIds: teacherId }]
    })
      .populate("batch", "batch_name batch_no name")
      .populate("syllabus", "subject")
      .populate("templateLecture", "title")
      .lean();

    // Assigned unique subjects count
    const uniqueSubjects = await BatchLecture.distinct("syllabus", {
      $or: [{ assignedTo: teacherId }, { teacherIds: teacherId }]
    });

    const assignedSubjects = uniqueSubjects.length;

    // Homework assigned by teacher
    const pendingHomework = await Homework.countDocuments({
      assignedBy: teacherId,
      status: "Pending Approval"
    });

    const completedHomework = await Homework.countDocuments({
      assignedBy: teacherId,
      status: "Approved"
    });

    // Subject Progress for teacher's subjects
    const progressList = await Promise.all(
      uniqueSubjects.map(async (subjId) => {
        const syllabus = await Syllabus.findById(subjId);
        const lectures = await BatchLecture.find({
          syllabus: subjId,
          lectureType: "Normal",
          $or: [{ assignedTo: teacherId }, { teacherIds: teacherId }]
        });
        const total = lectures.length;
        const completed = lectures.filter((l) => l.completionStatus === "Completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          subject: syllabus?.subject || "Unknown",
          progress
        };
      })
    );

    res.json({
      todayLectures,
      assignedSubjects,
      pendingHomework,
      completedHomework,
      subjectProgress: progressList
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find student batch
    const studentBatch = await Batch.findOne({ students: studentId });
    if (!studentBatch) {
      return res.status(404).json({ message: "No batch assigned to this student." });
    }

    const batchId = studentBatch._id;

    // Today's lectures for batch
    const todayLectures = await BatchLecture.find({ batch: batchId })
      .populate("assignedTo", "name")
      .populate("syllabus", "subject")
      .lean();

    // Homework for student
    const homework = await Homework.find({ student: studentId })
      .populate("assignedBy", "name")
      .populate("lecture", "title")
      .lean();

    // Overall progress percent of the batch
    const batchLectures = await BatchLecture.find({ batch: batchId, lectureType: "Normal" });
    const totalLectures = batchLectures.length;
    const completedLectures = batchLectures.filter((l) => l.completionStatus === "Completed").length;
    const progress = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

    // Attendance stats
    const attendanceRecords = await Attendance.find({
      batch: batchId,
      "records.student": studentId
    });

    let presentCount = 0;
    let absentCount = 0;

    attendanceRecords.forEach((record) => {
      const studentRec = record.records.find((r) => String(r.student) === String(studentId));
      if (studentRec) {
        if (studentRec.status === "Present" || studentRec.status === "present") presentCount++;
        else if (studentRec.status === "Absent" || studentRec.status === "absent") absentCount++;
      }
    });

    const totalAttendance = presentCount + absentCount;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    res.json({
      todayLectures,
      homework,
      progress,
      attendance: {
        present: presentCount,
        absent: absentCount,
        percentage: attendancePercentage
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
