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
    const activeStudents = await Student.countDocuments({ isActive: true });
    const pendingStudents = await Student.countDocuments({ isActive: false });
    const totalTeachers = await Teacher.countDocuments();
    const totalSubjects = await Syllabus.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const totalLectures = await Lecture.countDocuments({ lectureType: "Normal" });
    const pendingHomework = await Homework.countDocuments({ status: "pending_review" });
    const completedLectures = await BatchLecture.countDocuments({ completionStatus: "Completed" });

    // Calculate overall average subject progress
    const lectures = await BatchLecture.find({ lectureType: "Normal" });
    const total = lectures.length;
    const completed = lectures.filter((l) => l.completionStatus === "Completed").length;
    const subjectProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      totalStudents,
      activeStudents,
      pendingStudents,
      pendingApprovals: pendingStudents,
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
      status: "pending_review"
    });

    const completedHomework = await Homework.countDocuments({
      assignedBy: teacherId,
      status: "approved"
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

    // Find the student to get batch_name & batch_no
    const { Student } = await import("../models/student.model.js");
    const studentDoc = await Student.findById(studentId).lean();

    // Find student's batch by studentId in students array OR by batch_name+batch_no
    let studentBatch = await Batch.findOne({ students: studentId });
    if (!studentBatch && studentDoc?.batch_name) {
      studentBatch = await Batch.findOne({
        batch_name: studentDoc.batch_name,
        batch_no: studentDoc.batch_no,
      });
      // Auto-link student to batch for future queries
      if (studentBatch && !studentBatch.students.includes(studentId)) {
        studentBatch.students.push(studentId);
        await studentBatch.save();
      }
    }

    const batchId = studentBatch?._id;

    // All batch-mates for homework fallback
    let batchStudentIds = [studentId.toString()];
    if (studentBatch?.students?.length > 0) {
      batchStudentIds = studentBatch.students.map((id) => id.toString());
      if (!batchStudentIds.includes(studentId.toString())) {
        batchStudentIds.push(studentId.toString());
      }
    }

    // Today's lectures for batch
    const todayLectures = batchId
      ? await BatchLecture.find({ batch: batchId })
          .populate("assignedTo", "name")
          .populate({ path: "syllabus", select: "subject" })
          .lean()
      : [];

    // Homework — direct by studentId
    const homeworkQuery = { student: studentId };
    
    const homework = await Homework.find(homeworkQuery)
      .populate("assignedBy", "name")
      .populate({ path: "lecture", select: "title", populate: { path: "syllabus", select: "subject" } })
      .sort({ createdAt: -1 })
      .lean();

    // Overall progress percent of the batch
    let progress = 0;
    if (batchId) {
      const batchLectures = await BatchLecture.find({ batch: batchId, lectureType: "Normal" });
      const totalLectures = batchLectures.length;
      const completedLectures = batchLectures.filter((l) => l.completionStatus === "Completed").length;
      progress = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;
    }

    // Attendance stats
    let presentCount = 0;
    let absentCount = 0;
    if (batchId) {
      const attendanceRecords = await Attendance.find({
        batch: batchId,
        "records.student": studentId,
      });
      attendanceRecords.forEach((record) => {
        const studentRec = record.records.find((r) => String(r.student) === String(studentId));
        if (studentRec) {
          if (studentRec.status === "Present" || studentRec.status === "present") presentCount++;
          else if (studentRec.status === "Absent" || studentRec.status === "absent") absentCount++;
        }
      });
    }

    const totalAttendance = presentCount + absentCount;
    const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    res.json({
      todayLectures,
      homework,
      progress,
      attendance: {
        present: presentCount,
        absent: absentCount,
        percentage: attendancePercentage,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
