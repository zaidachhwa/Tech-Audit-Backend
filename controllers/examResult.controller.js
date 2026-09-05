import ExamResult from "../models/examResult.model.js";
import Exam from "../models/exam.model.js";
import Student from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import StudentBatchMapping from "../models/studentBatchMapping.model.js";
import ExamAttempt from "../models/examAttempt.model.js";
import Report from "../models/report.model.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Save or Update a student's exam result
export const saveOrUpdateResult = async (req, res) => {
  try {
    const { examId, studentId, marksObtained, totalMarks, grade, status, remarks, gradedPaper } = req.body;

    if (!examId || !studentId || marksObtained === undefined || totalMarks === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    const result = await ExamResult.findOneAndUpdate(
      { exam: examId, student: studentId },
      {
        marksObtained,
        totalMarks,
        grade,
        status,
        remarks,
        gradedPaper,
        createdBy: userId,
        createdByRole: userRole
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "Result saved successfully", result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bulk save or update multiple student exam results at once
export const saveOrUpdateBatchResults = async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ message: "No results provided to save" });
    }

    const userId = req.user.id || req.user._id;
    const userRole = req.user.role;

    const savedResults = await Promise.all(
      results.map(async (item) => {
        const { examId, studentId, marksObtained, totalMarks, grade, status, remarks, gradedPaper } = item;
        if (!examId || !studentId || marksObtained === undefined || totalMarks === undefined || marksObtained === "") {
          return null;
        }

        return ExamResult.findOneAndUpdate(
          { exam: examId, student: studentId },
          {
            marksObtained: Number(marksObtained),
            totalMarks: Number(totalMarks),
            grade,
            status,
            remarks,
            gradedPaper,
            createdBy: userId,
            createdByRole: userRole
          },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      })
    );

    const filtered = savedResults.filter(Boolean);
    res.status(200).json({ message: `${filtered.length} results saved successfully`, results: filtered });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get results for a specific batch (Admin/Teacher view)
export const getResultsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(200).json({ exams: [], students: [], results: [] });
    }

    // Find batch details
    const batch = await Batch.findById(batchId);

    // Find all exams for this batch
    const exams = await Exam.find({ batch: batchId }).sort({ date: -1 });
    const examIds = exams.map(e => e._id);

    // Find student mappings
    const mappings = await StudentBatchMapping.find({ batch: batchId });
    const mappedStudentIds = mappings.map(m => m.student).filter(s => s && mongoose.Types.ObjectId.isValid(s));

    const studentQuery = [];
    if (batch && batch.students && batch.students.length > 0) {
      const validBatchStudents = batch.students.filter(s => s && mongoose.Types.ObjectId.isValid(s));
      if (validBatchStudents.length > 0) {
        studentQuery.push({ _id: { $in: validBatchStudents } });
      }
    }
    if (mappedStudentIds.length > 0) {
      studentQuery.push({ _id: { $in: mappedStudentIds } });
    }
    if (batch && batch.batch_name && batch.batch_no) {
      studentQuery.push({ batch_name: batch.batch_name, batch_no: String(batch.batch_no) });
      studentQuery.push({ batch_name: batch.batch_name, batch_no: Number(batch.batch_no) });
    }

    let students = [];
    if (studentQuery.length > 0) {
      students = await Student.find({ $or: studentQuery }).select("name email batch_name batch_no _id").lean();
    } else {
      students = await Student.find({ batch: batchId }).select("name email batch_name batch_no _id").lean();
    }

    // Find all results for these exams
    const results = await ExamResult.find({ exam: { $in: examIds } });

    res.status(200).json({
      exams,
      students,
      results
    });
  } catch (err) {
    console.error("Error in getResultsByBatch:", err);
    res.status(200).json({ exams: [], students: [], results: [] });
  }
};

// Get results for a specific student (Student Dashboard view)
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(200).json([]);
    }

    const student = await Student.findById(studentId);

    const existingResults = await ExamResult.find({ student: studentId })
      .populate({ path: "exam", select: "subject date examType questionPaper startTime endTime durationMinutes totalMarks passingMarks instructions", model: Exam })
      .sort({ createdAt: -1 });

    const sanitizedResults = existingResults.map((r) => {
      const rObj = r.toObject ? r.toObject() : { ...r };
      if (rObj.marksObtained !== null && rObj.marksObtained !== undefined && rObj.totalMarks > 0) {
        const pct = Math.round((rObj.marksObtained / rObj.totalMarks) * 100);
        let passThresholdPct = 40;
        if (rObj.exam && rObj.exam.passingMarks > 0) {
          if (rObj.exam.passingMarks <= rObj.totalMarks) {
            passThresholdPct = (rObj.exam.passingMarks / rObj.totalMarks) * 100;
          } else {
            passThresholdPct = rObj.exam.passingMarks;
          }
        }
        rObj.status = pct >= passThresholdPct ? "Pass" : "Fail";
      }
      return rObj;
    });

    const resultMap = new Map();
    sanitizedResults.forEach((r) => {
      if (r.exam && r.exam._id) {
        resultMap.set(r.exam._id.toString(), r);
      }
    });

    let combined = [...sanitizedResults];

    if (student) {
      let batchIds = [];
      const mappings = await StudentBatchMapping.find({ student: studentId });
      if (mappings.length > 0) {
        batchIds.push(...mappings.map(m => m.batch));
      }

      const directBatches = await Batch.find({ students: studentId });
      if (directBatches.length > 0) {
        batchIds.push(...directBatches.map(b => b._id));
      }

      if (student.batch_name && student.batch_no) {
        const foundBatches = await Batch.find({
          batch_name: student.batch_name,
          $or: [{ batch_no: String(student.batch_no) }, { batch_no: Number(student.batch_no) }]
        });
        batchIds.push(...foundBatches.map(b => b._id));
      }

      const validBatchIds = batchIds
        .filter(b => b && mongoose.Types.ObjectId.isValid(b))
        .map(b => String(b));

      const uniqueBatchIds = [...new Set(validBatchIds)];

      if (uniqueBatchIds.length > 0) {
        const batchExams = await Exam.find({ batch: { $in: uniqueBatchIds } }).sort({ date: -1 });
        for (const exam of batchExams) {
          if (!resultMap.has(exam._id.toString())) {
            let itemStatus = "Pending";
            let marksObtained = null;
            let totalMarks = null;
            let grade = null;

            if (exam.examType === "online") {
              const attempt = await ExamAttempt.findOne({ exam: exam._id, student: studentId });
              if (attempt && (attempt.status === "completed" || attempt.status === "auto_submitted" || (attempt.tabSwitchCount && attempt.tabSwitchCount >= 3))) {
                itemStatus = attempt.percentage >= (exam.passingMarks || 40) ? "Pass" : "Fail";
                marksObtained = attempt.score;
                totalMarks = attempt.totalMarks || exam.totalMarks;
                grade = attempt.percentage >= 90 ? "A+" : attempt.percentage >= 80 ? "A" : attempt.percentage >= 70 ? "B" : attempt.percentage >= 60 ? "C" : attempt.percentage >= 50 ? "D" : "F";
              }
            }

            combined.push({
              _id: `pending_${exam._id}`,
              exam: {
                _id: exam._id,
                subject: exam.subject,
                date: exam.date,
                examType: exam.examType,
                questionPaper: exam.questionPaper,
                startTime: exam.startTime,
                endTime: exam.endTime,
                durationMinutes: exam.durationMinutes,
                totalMarks: exam.totalMarks,
                passingMarks: exam.passingMarks,
                instructions: exam.instructions
              },
              student: studentId,
              marksObtained,
              totalMarks,
              grade,
              status: itemStatus,
              remarks: itemStatus === "Pending" ? "Result pending" : "Online Exam Completed"
            });
          }
        }
      }
    }

    res.status(200).json(combined);
  } catch (err) {
    console.error("Error in getStudentResults:", err);
    res.status(200).json([]);
  }
};

// Get leaderboard for a specific exam
export const getLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(200).json([]);
    }

    const results = await ExamResult.find({ exam: examId })
      .populate({ path: "student", select: "name email", model: Student })
      .sort({ marksObtained: -1 });

    res.status(200).json(results);
  } catch (err) {
    console.error("Error in getLeaderboard:", err);
    res.status(200).json([]);
  }
};

// Configurable threshold for improvement calculation (in percentage points)
const IMPROVEMENT_THRESHOLD = 3;

/**
 * Get comprehensive Student Exam Report
 * GET /api/exam-results/student/:studentId/report
 * Query params: examType ("all" | "online" | "offline"), startDate, endDate
 */
export const getStudentExamReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, startDate, endDate, subject } = req.query;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const student = await Student.findById(studentId).select("name email enrollmentNo rollNo course department batch_name batch_no");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 1. Fetch completed/graded ExamResult documents
    const results = await ExamResult.find({ student: studentId })
      .populate({
        path: "exam",
        select: "subject date examType totalMarks passingMarks questions batch",
        model: Exam
      })
      .lean();

    // 2. Fetch completed or auto-submitted ExamAttempt documents for online exams
    const attempts = await ExamAttempt.find({
      student: studentId,
      status: { $in: ["completed", "auto_submitted"] }
    })
      .populate({
        path: "exam",
        select: "subject date examType totalMarks passingMarks questions batch",
        model: Exam
      })
      .lean();

    // Combine and normalize results into a single list of valid completed exam attempts
    const examMap = new Map();

    results.forEach((r) => {
      if (r.marksObtained !== null && r.marksObtained !== undefined && r.totalMarks > 0) {
        const examObj = r.exam && typeof r.exam === "object" && r.exam._id ? r.exam : null;
        const key = examObj ? examObj._id.toString() : (r.exam ? r.exam.toString() : r._id.toString());
        const pct = Math.round((Number(r.marksObtained) / Number(r.totalMarks)) * 100);
        let passThresholdPct = 40;
        if (examObj && examObj.passingMarks > 0) {
          if (examObj.passingMarks <= r.totalMarks) {
            passThresholdPct = (examObj.passingMarks / r.totalMarks) * 100;
          } else {
            passThresholdPct = examObj.passingMarks;
          }
        }
        const status = r.status || (pct >= passThresholdPct ? "Pass" : "Fail");
        let grade = r.grade;
        if (!grade) {
          if (pct >= 90) grade = "A+";
          else if (pct >= 80) grade = "A";
          else if (pct >= 70) grade = "B";
          else if (pct >= 60) grade = "C";
          else if (pct >= 50) grade = "D";
          else grade = "F";
        }

        examMap.set(key, {
          resultId: r._id,
          examId: key,
          subject: examObj?.subject || "General Exam",
          examType: examObj?.examType || "offline",
          date: examObj?.date ? new Date(examObj.date) : new Date(r.createdAt || Date.now()),
          marksObtained: Number(r.marksObtained),
          totalMarks: Number(r.totalMarks),
          percentage: pct,
          grade,
          status,
          remarks: r.remarks || "",
          questions: examObj?.questions || []
        });
      }
    });

    // Also include any completed attempt if not already in examMap
    attempts.forEach((a) => {
      const examObj = a.exam && typeof a.exam === "object" && a.exam._id ? a.exam : null;
      const key = examObj ? examObj._id.toString() : (a.exam ? a.exam.toString() : a._id.toString());

      if (!examMap.has(key)) {
        const totMarks = Number(a.totalMarks || (examObj ? examObj.totalMarks : 100));
        const score = Number(a.score || 0);
        const pct = totMarks > 0 ? Math.round((score / totMarks) * 100) : 0;

        let passThresholdPct = 40;
        if (examObj && examObj.passingMarks > 0) {
          if (examObj.passingMarks <= totMarks) {
            passThresholdPct = (examObj.passingMarks / totMarks) * 100;
          } else {
            passThresholdPct = examObj.passingMarks;
          }
        }
        const status = pct >= passThresholdPct ? "Pass" : "Fail";
        let grade = "F";
        if (pct >= 90) grade = "A+";
        else if (pct >= 80) grade = "A";
        else if (pct >= 70) grade = "B";
        else if (pct >= 60) grade = "C";
        else if (pct >= 50) grade = "D";

        examMap.set(key, {
          attemptId: a._id,
          examId: key,
          subject: examObj?.subject || "Online Exam",
          examType: "online",
          date: a.submittedAt ? new Date(a.submittedAt) : (examObj?.date ? new Date(examObj.date) : new Date(a.createdAt || Date.now())),
          marksObtained: score,
          totalMarks: totMarks,
          percentage: pct,
          grade,
          status,
          remarks: `Online Exam (${a.status})`,
          answers: a.answers || [],
          questions: examObj?.questions || []
        });
      }
    });

    let allExams = Array.from(examMap.values());
    const availableSubjects = Array.from(
      new Set(allExams.map((e) => e.subject).filter(Boolean))
    ).sort();

    // Sort primarily by Subject (A-Z), secondarily by Date (oldest to newest)
    allExams.sort((a, b) => {
      const subA = (a.subject || "General").toLowerCase();
      const subB = (b.subject || "General").toLowerCase();
      if (subA !== subB) {
        return subA.localeCompare(subB);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Filter by examType if requested
    if (examType && examType !== "all") {
      allExams = allExams.filter((e) => e.examType.toLowerCase() === examType.toLowerCase());
    }

    // Filter by subject(s) if requested
    if (subject && subject !== "all") {
      const selectedList = subject.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (selectedList.length > 0) {
        allExams = allExams.filter((e) => e.subject && selectedList.includes(e.subject.toLowerCase()));
      }
    }

    // Filter by date range if requested
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      allExams = allExams.filter((e) => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      allExams = allExams.filter((e) => new Date(e.date) <= end);
    }

    const totalExamsAttempted = allExams.length;

    if (totalExamsAttempted === 0) {
      return res.status(200).json({
        studentInfo: {
          id: student._id,
          name: student.name,
          enrollmentNo: student.enrollmentNo || "N/A",
          rollNo: student.rollNo || "N/A",
          email: student.email,
          batch_name: student.batch_name,
          batch_no: student.batch_no,
          course: student.course,
          department: student.department
        },
        availableSubjects,
        hasSufficientData: false,
        message: "No exam data found for this student.",
        thresholdUsed: IMPROVEMENT_THRESHOLD,
        summary: {
          totalExamsAttempted: 0,
          averagePercentage: 0,
          highestScore: 0,
          lowestScore: 0,
          overallChangePoints: 0,
          recentChangePoints: 0,
          overallStatus: "insufficient_data",
          improvedCount: 0,
          declinedCount: 0,
          noChangeCount: 0
        },
        recentPerformance: null,
        examHistory: [],
        subjectBreakdown: {
          subjectPerformance: [],
          strongAreas: [],
          weakAreas: [],
          improvedAreas: [],
          declinedAreas: []
        },
        graphData: []
      });
    }

    // Compute basic summary stats
    const percentages = allExams.map((e) => e.percentage);
    const sumPct = percentages.reduce((acc, val) => acc + val, 0);
    const averagePercentage = Math.round(sumPct / totalExamsAttempted);
    const highestScore = Math.max(...percentages);
    const lowestScore = Math.min(...percentages);

    // Progression & Trend Calculations
    let improvedCount = 0;
    let declinedCount = 0;
    let noChangeCount = 0;

    const examHistory = allExams.map((exam, idx) => {
      let changePoints = null;
      let changeType = "none"; // "Improved", "Declined", "No significant change"

      if (idx > 0) {
        const prevPct = allExams[idx - 1].percentage;
        changePoints = exam.percentage - prevPct;

        if (changePoints > IMPROVEMENT_THRESHOLD) {
          changeType = "Improved";
          improvedCount++;
        } else if (changePoints < -IMPROVEMENT_THRESHOLD) {
          changeType = "Declined";
          declinedCount++;
        } else {
          changeType = "No significant change";
          noChangeCount++;
        }
      }

      return {
        ...exam,
        attemptNumber: idx + 1,
        previousPercentage: idx > 0 ? allExams[idx - 1].percentage : null,
        changePoints,
        changeType
      };
    });

    const firstExam = examHistory[0];
    const latestExam = examHistory[totalExamsAttempted - 1];
    const previousExam = totalExamsAttempted > 1 ? examHistory[totalExamsAttempted - 2] : null;

    const overallChangePoints = latestExam.percentage - firstExam.percentage;
    const recentChangePoints = previousExam ? latestExam.percentage - previousExam.percentage : 0;

    // Overall Trend Status determination
    let overallStatus = "insufficient_data";
    if (totalExamsAttempted < 2) {
      overallStatus = "insufficient_data";
    } else {
      if (recentChangePoints > IMPROVEMENT_THRESHOLD) {
        overallStatus = "Improved";
      } else if (recentChangePoints < -IMPROVEMENT_THRESHOLD) {
        overallStatus = "Declined";
      } else {
        overallStatus = "No significant change";
      }
    }

    // Recent performance object
    const recentPerformance = {
      latestScore: latestExam.percentage,
      latestSubject: latestExam.subject,
      latestDate: latestExam.date,
      previousScore: previousExam ? previousExam.percentage : null,
      previousSubject: previousExam ? previousExam.subject : null,
      changePoints: recentChangePoints,
      currentTrend: overallStatus
    };

    // Subject/Topic Breakdown
    const subjectMap = new Map();
    examHistory.forEach((e) => {
      const subName = e.subject || "General";
      if (!subjectMap.has(subName)) {
        subjectMap.set(subName, []);
      }
      subjectMap.get(subName).push(e);
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, list]) => {
      const count = list.length;
      const avg = Math.round(list.reduce((acc, curr) => acc + curr.percentage, 0) / count);
      const latestSubExam = list[count - 1];
      const prevSubExam = count > 1 ? list[count - 2] : null;
      const subChange = prevSubExam ? latestSubExam.percentage - prevSubExam.percentage : 0;

      let subTrend = "Stable";
      if (count >= 2) {
        if (subChange > IMPROVEMENT_THRESHOLD) subTrend = "Improved";
        else if (subChange < -IMPROVEMENT_THRESHOLD) subTrend = "Declined";
      }

      return {
        subject,
        examCount: count,
        averagePercentage: avg,
        latestPercentage: latestSubExam.percentage,
        subChange,
        trend: subTrend,
        isStrong: avg >= 75,
        isWeak: avg < 50
      };
    });

    const strongAreas = subjectPerformance.filter((s) => s.isStrong).map((s) => s.subject);
    const weakAreas = subjectPerformance.filter((s) => s.isWeak).map((s) => s.subject);
    const improvedAreas = subjectPerformance.filter((s) => s.trend === "Improved").map((s) => s.subject);
    const declinedAreas = subjectPerformance.filter((s) => s.trend === "Declined").map((s) => s.subject);

    // Prepare graph data
    const graphData = examHistory.map((e) => ({
      id: e.examId,
      name: e.subject,
      shortDate: new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      percentage: e.percentage,
      marksObtained: e.marksObtained,
      totalMarks: e.totalMarks,
      examType: e.examType,
      changePoints: e.changePoints,
      changeType: e.changeType
    }));

    res.status(200).json({
      studentInfo: {
        id: student._id,
        name: student.name,
        enrollmentNo: student.enrollmentNo || "N/A",
        rollNo: student.rollNo || "N/A",
        email: student.email,
        batch_name: student.batch_name,
        batch_no: student.batch_no,
        course: student.course,
        department: student.department
      },
      availableSubjects,
      hasSufficientData: totalExamsAttempted >= 2,
      thresholdUsed: IMPROVEMENT_THRESHOLD,
      summary: {
        totalExamsAttempted,
        averagePercentage,
        highestScore,
        lowestScore,
        overallChangePoints,
        recentChangePoints,
        overallStatus,
        improvedCount,
        declinedCount,
        noChangeCount
      },
      recentPerformance,
      subjectBreakdown: {
        subjectPerformance,
        strongAreas,
        weakAreas,
        improvedAreas,
        declinedAreas
      },
      examHistory,
      graphData
    });
  } catch (err) {
    console.error("Error in getStudentExamReport:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Helper to save or update Student Exam Report document in Report model
 */
export const saveOrUpdateExamReportHelper = async (studentId, queryParams = {}) => {
  const { examType, startDate, endDate, subject } = queryParams;

  const student = await Student.findById(studentId);
  if (!student) return null;

  const results = await ExamResult.find({ student: studentId })
    .populate({
      path: "exam",
      select: "subject date examType totalMarks passingMarks",
      model: Exam
    })
    .lean();

  const attempts = await ExamAttempt.find({
    student: studentId,
    status: { $in: ["completed", "auto_submitted"] }
  })
    .populate({
      path: "exam",
      select: "subject date examType totalMarks passingMarks",
      model: Exam
    })
    .lean();

  const examMap = new Map();

  results.forEach((r) => {
    if (r.marksObtained !== null && r.marksObtained !== undefined && r.totalMarks > 0) {
      const examObj = r.exam && typeof r.exam === "object" && r.exam._id ? r.exam : null;
      const key = examObj ? examObj._id.toString() : (r.exam ? r.exam.toString() : r._id.toString());
      const pct = Math.round((Number(r.marksObtained) / Number(r.totalMarks)) * 100);
      examMap.set(key, {
        subject: examObj?.subject || "General Exam",
        examType: examObj?.examType || "offline",
        date: examObj?.date ? new Date(examObj.date) : new Date(r.createdAt || Date.now()),
        marksObtained: Number(r.marksObtained),
        totalMarks: Number(r.totalMarks),
        percentage: pct
      });
    }
  });

  attempts.forEach((a) => {
    const examObj = a.exam && typeof a.exam === "object" && a.exam._id ? a.exam : null;
    const key = examObj ? examObj._id.toString() : (a.exam ? a.exam.toString() : a._id.toString());

    if (!examMap.has(key)) {
      const totMarks = Number(a.totalMarks || (examObj ? examObj.totalMarks : 100));
      const score = Number(a.score || 0);
      const pct = totMarks > 0 ? Math.round((score / totMarks) * 100) : 0;
      examMap.set(key, {
        subject: examObj?.subject || "Online Exam",
        examType: "online",
        date: a.submittedAt ? new Date(a.submittedAt) : (examObj?.date ? new Date(examObj.date) : new Date(a.createdAt || Date.now())),
        marksObtained: score,
        totalMarks: totMarks,
        percentage: pct
      });
    }
  });

  let allExams = Array.from(examMap.values());

  if (examType && examType !== "all") {
    allExams = allExams.filter((e) => e.examType.toLowerCase() === examType.toLowerCase());
  }
  if (subject && subject !== "all") {
    const selectedList = subject.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (selectedList.length > 0) {
      allExams = allExams.filter((e) => e.subject && selectedList.includes(e.subject.toLowerCase()));
    }
  }
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    allExams = allExams.filter((e) => new Date(e.date) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    allExams = allExams.filter((e) => new Date(e.date) <= end);
  }

  const totalExamsAttempted = allExams.length;
  const percentages = allExams.map((e) => e.percentage);
  const averagePercentage = totalExamsAttempted > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / totalExamsAttempted) : 0;
  const highestScore = totalExamsAttempted > 0 ? Math.max(...percentages) : 0;
  const lowestScore = totalExamsAttempted > 0 ? Math.min(...percentages) : 0;

  const subjectMap = new Map();
  allExams.forEach((e) => {
    const subName = e.subject || "General";
    if (!subjectMap.has(subName)) subjectMap.set(subName, []);
    subjectMap.get(subName).push(e);
  });

  const parameters = Array.from(subjectMap.entries()).map(([sub, list]) => {
    const avg = Math.round(list.reduce((acc, curr) => acc + curr.percentage, 0) / list.length);
    return {
      name: `${sub} (${list.length} Exam${list.length > 1 ? "s" : ""})`,
      score: avg,
      totalScore: 100
    };
  });

  if (parameters.length === 0) {
    parameters.push({ name: "Overall Exam Score", score: averagePercentage, totalScore: 100 });
  }

  const remarksText = `Exam Performance Summary — Total Exams: ${totalExamsAttempted} | Average Score: ${averagePercentage}% | Highest: ${highestScore}% | Lowest: ${lowestScore}%`;

  const feedbackPoints = [
    { point1: `Total completed exams evaluated: ${totalExamsAttempted} with average score of ${averagePercentage}%.` },
    { point2: `Highest score: ${highestScore}%, Lowest score: ${lowestScore}%.` },
    { point3: `Evaluated across ${subjectMap.size || 1} subject area(s).` }
  ];

  const overallStatus = averagePercentage >= 75 ? "Strong" : averagePercentage >= 50 ? "Moderate" : "Needs Focus";

  let report = await Report.findOne({ student: studentId, reportType: "exam" });

  if (report) {
    report.parameters = parameters;
    report.feedbackSchema = feedbackPoints;
    report.overallRemarks = remarksText;
    report.auditDate = new Date();
    report.status = "final";
    report.examSummary = {
      totalExamsAttempted,
      averagePercentage,
      highestScore,
      lowestScore,
      overallStatus
    };
    await report.save();
  } else {
    report = await Report.create({
      student: studentId,
      reportType: "exam",
      parameters,
      feedbackSchema: feedbackPoints,
      overallRemarks: remarksText,
      auditDate: new Date(),
      status: "final",
      examSummary: {
        totalExamsAttempted,
        averagePercentage,
        highestScore,
        lowestScore,
        overallStatus
      }
    });
  }

  return report;
};

/**
 * Save Student Exam Report directly to All Reports
 * POST /api/exam-results/student/:studentId/report/save
 */
export const saveStudentExamReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const report = await saveOrUpdateExamReportHelper(studentId, { ...req.query, ...req.body });
    if (!report) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json({ message: "Exam report saved to All Reports successfully", report });
  } catch (err) {
    console.error("Error saving student exam report:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Download Student Exam Report as PDF with official Letterhead and Footer
 * GET /api/exam-results/student/:studentId/report/pdf
 * Query params: examType ("all" | "online" | "offline"), subject, startDate, endDate
 */
export const downloadStudentExamReportPdf = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examType, startDate, endDate, subject } = req.query;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const student = await Student.findById(studentId).select("name email enrollmentNo rollNo course department batch_name batch_no");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Auto-save exam report into All Reports upon download
    try {
      await saveOrUpdateExamReportHelper(studentId, req.query);
    } catch (saveErr) {
      console.error("Auto-save on download failed quietly:", saveErr.message);
    }

    // 1. Fetch completed/graded ExamResult documents
    const results = await ExamResult.find({ student: studentId })
      .populate({
        path: "exam",
        select: "subject date examType totalMarks passingMarks questions batch",
        model: Exam
      })
      .lean();

    // 2. Fetch completed/auto_submitted ExamAttempt documents
    const attempts = await ExamAttempt.find({
      student: studentId,
      status: { $in: ["completed", "auto_submitted"] }
    })
      .populate({
        path: "exam",
        select: "subject date examType totalMarks passingMarks questions batch",
        model: Exam
      })
      .lean();

    const examMap = new Map();

    results.forEach((r) => {
      if (r.marksObtained !== null && r.marksObtained !== undefined && r.totalMarks > 0) {
        const examObj = r.exam && typeof r.exam === "object" && r.exam._id ? r.exam : null;
        const key = examObj ? examObj._id.toString() : (r.exam ? r.exam.toString() : r._id.toString());
        const pct = Math.round((Number(r.marksObtained) / Number(r.totalMarks)) * 100);
        let passThresholdPct = 40;
        if (examObj && examObj.passingMarks > 0) {
          if (examObj.passingMarks <= r.totalMarks) {
            passThresholdPct = (examObj.passingMarks / r.totalMarks) * 100;
          } else {
            passThresholdPct = examObj.passingMarks;
          }
        }
        const status = r.status || (pct >= passThresholdPct ? "Pass" : "Fail");
        let grade = r.grade;
        if (!grade) {
          if (pct >= 90) grade = "A+";
          else if (pct >= 80) grade = "A";
          else if (pct >= 70) grade = "B";
          else if (pct >= 60) grade = "C";
          else if (pct >= 50) grade = "D";
          else grade = "F";
        }

        examMap.set(key, {
          resultId: r._id,
          examId: key,
          subject: examObj?.subject || "General Exam",
          examType: examObj?.examType || "offline",
          date: examObj?.date ? new Date(examObj.date) : new Date(r.createdAt || Date.now()),
          marksObtained: Number(r.marksObtained),
          totalMarks: Number(r.totalMarks),
          percentage: pct,
          grade,
          status,
          remarks: r.remarks || ""
        });
      }
    });

    attempts.forEach((a) => {
      const examObj = a.exam && typeof a.exam === "object" && a.exam._id ? a.exam : null;
      const key = examObj ? examObj._id.toString() : (a.exam ? a.exam.toString() : a._id.toString());

      if (!examMap.has(key)) {
        const totMarks = Number(a.totalMarks || (examObj ? examObj.totalMarks : 100));
        const score = Number(a.score || 0);
        const pct = totMarks > 0 ? Math.round((score / totMarks) * 100) : 0;

        let passThresholdPct = 40;
        if (examObj && examObj.passingMarks > 0) {
          if (examObj.passingMarks <= totMarks) {
            passThresholdPct = (examObj.passingMarks / totMarks) * 100;
          } else {
            passThresholdPct = examObj.passingMarks;
          }
        }
        const status = pct >= passThresholdPct ? "Pass" : "Fail";
        let grade = "F";
        if (pct >= 90) grade = "A+";
        else if (pct >= 80) grade = "A";
        else if (pct >= 70) grade = "B";
        else if (pct >= 60) grade = "C";
        else if (pct >= 50) grade = "D";

        examMap.set(key, {
          attemptId: a._id,
          examId: key,
          subject: examObj?.subject || "Online Exam",
          examType: "online",
          date: a.submittedAt ? new Date(a.submittedAt) : (examObj?.date ? new Date(examObj.date) : new Date(a.createdAt || Date.now())),
          marksObtained: score,
          totalMarks: totMarks,
          percentage: pct,
          grade,
          status,
          remarks: `Online Exam (${a.status})`
        });
      }
    });

    let allExams = Array.from(examMap.values());
    // Sort primarily by Subject (A-Z), secondarily by Date (oldest to newest)
    allExams.sort((a, b) => {
      const subA = (a.subject || "General").toLowerCase();
      const subB = (b.subject || "General").toLowerCase();
      if (subA !== subB) {
        return subA.localeCompare(subB);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Apply Filters
    if (examType && examType !== "all") {
      allExams = allExams.filter((e) => e.examType.toLowerCase() === examType.toLowerCase());
    }
    if (subject && subject !== "all") {
      const selectedList = subject.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (selectedList.length > 0) {
        allExams = allExams.filter((e) => e.subject && selectedList.includes(e.subject.toLowerCase()));
      }
    }
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      allExams = allExams.filter((e) => new Date(e.date) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      allExams = allExams.filter((e) => new Date(e.date) <= end);
    }

    // Compute basic statistics
    const totalExamsAttempted = allExams.length;
    const percentages = allExams.map((e) => e.percentage);
    const averagePercentage = totalExamsAttempted > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / totalExamsAttempted) : 0;
    const highestScore = totalExamsAttempted > 0 ? Math.max(...percentages) : 0;
    const lowestScore = totalExamsAttempted > 0 ? Math.min(...percentages) : 0;

    // Subject breakdown
    const subjectMap = new Map();
    allExams.forEach((e) => {
      const subName = e.subject || "General";
      if (!subjectMap.has(subName)) subjectMap.set(subName, []);
      subjectMap.get(subName).push(e);
    });

    const subjectPerformance = Array.from(subjectMap.entries()).map(([sub, list]) => {
      const avg = Math.round(list.reduce((acc, curr) => acc + curr.percentage, 0) / list.length);
      return { subject: sub, examCount: list.length, averagePercentage: avg };
    });

    // Create PDF Document using PDFKit
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const cleanStudentName = (student.name || "Student").replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=exam-report-${cleanStudentName}.pdf`);

    doc.pipe(res);

    const headerImg = path.join(process.cwd(), "public", "newHeader.jpeg");
    const footerImg = path.join(process.cwd(), "public", "newFooter.jpeg");
    const authSignImg = path.join(process.cwd(), "public", "Sign.png");
    const authStampImg = path.join(process.cwd(), "public", "Stamp.png");

    const HEADER_OFFSET = 145;
    const PAGE_BOTTOM = 720;
    const FOOTER_Y = 750;
    const FOOTER_HEIGHT = 90;

    const drawHeader = () => {
      if (fs.existsSync(headerImg)) {
        try { doc.image(headerImg, 0, 0, { width: 595 }); } catch (e) { console.error("PDF Header error:", e.message); }
      }
    };

    const drawFooter = () => {
      if (fs.existsSync(footerImg)) {
        try { doc.image(footerImg, 0, FOOTER_Y, { width: 595, height: FOOTER_HEIGHT }); } catch (e) { console.error("PDF Footer error:", e.message); }
      }
    };

    const ensureSpace = (space = 30) => {
      if (doc.y + space > PAGE_BOTTOM) {
        drawFooter();
        doc.addPage();
        // pageAdded event fires drawHeader() and sets doc.y = HEADER_OFFSET (145)
      }
    };

    doc.on("pageAdded", () => {
      drawHeader();
      doc.y = HEADER_OFFSET;
    });

    // Page 1 Header
    drawHeader();
    doc.y = HEADER_OFFSET;

    // Title
    doc.fontSize(15).fillColor("#0F3C8A").font("Helvetica-Bold").text("STUDENT EXAM PERFORMANCE REPORT", 50, doc.y, { align: "center" });
    doc.moveDown(0.6);

    // Meta Section
    const startY = doc.y;
    doc.fontSize(11).fillColor("#1E293B").font("Helvetica-Bold").text(student.name || "N/A", 50, startY);
    doc.fontSize(9).fillColor("#64748B").font("Helvetica")
      .text(`Email: ${student.email || "N/A"}`, 50, doc.y + 2)
      .text(`Roll No: ${student.rollNo || "N/A"} | Enrollment: ${student.enrollmentNo || "N/A"}`, 50, doc.y + 2);

    const pageWidth = 595;
    const rightMargin = 50;
    const colW = 220;
    const xRight = pageWidth - rightMargin - colW;

    const filterTypeStr = examType && examType !== "all" ? examType.toUpperCase() : "ALL EXAMS";
    const filterSubStr = subject && subject !== "all" ? subject : "ALL SUBJECTS";

    doc.fontSize(9).fillColor("#1E293B").font("Helvetica-Bold")
      .text(`Batch: ${student.batch_name || "N/A"} (${student.batch_no || "N/A"})`, xRight, startY, { width: colW, align: "right" })
      .font("Helvetica").fillColor("#64748B")
      .text(`Filters: ${filterTypeStr} | ${filterSubStr}`, xRight, doc.y + 2, { width: colW, align: "right" })
      .text(`Report Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`, xRight, doc.y + 2, { width: colW, align: "right" });

    doc.y = Math.max(doc.y, startY + 45);
    doc.moveDown(0.8);

    // Overview Stats Card
    ensureSpace(70);
    doc.fontSize(11).fillColor("#0F3C8A").font("Helvetica-Bold").text("Overall Performance Summary", 50);
    doc.moveDown(0.3);

    const cardY = doc.y;
    const cardW = 495;
    const cardH = 45;
    doc.roundedRect(50, cardY, cardW, cardH, 6).lineWidth(1).strokeColor("#E2E8F0").stroke();

    const colWidthStat = cardW / 4;
    const stats = [
      { label: "Total Exams", val: `${totalExamsAttempted}` },
      { label: "Average Score", val: `${averagePercentage}%` },
      { label: "Highest Score", val: `${highestScore}%` },
      { label: "Lowest Score", val: `${lowestScore}%` }
    ];

    stats.forEach((st, idx) => {
      const sx = 50 + idx * colWidthStat;
      doc.fontSize(8).fillColor("#64748B").font("Helvetica").text(st.label, sx + 5, cardY + 8, { width: colWidthStat - 10, align: "center" });
      doc.fontSize(13).fillColor("#0F3C8A").font("Helvetica-Bold").text(st.val, sx + 5, cardY + 22, { width: colWidthStat - 10, align: "center" });
    });

    doc.y = cardY + cardH + 12;

    // Subject Performance Breakdown Table
    if (subjectPerformance.length > 0) {
      ensureSpace(80);
      doc.fontSize(11).fillColor("#0F3C8A").font("Helvetica-Bold").text("Subject-wise Performance", 50);
      doc.moveDown(0.3);

      const drawSubHeader = () => {
        const y = doc.y;
        doc.rect(50, y, 495, 20).fill("#F1F5F9");
        doc.fontSize(9).fillColor("#334155").font("Helvetica-Bold")
          .text("Subject Name", 60, y + 5, { width: 220 })
          .text("Total Exams", 280, y + 5, { width: 100, align: "center" })
          .text("Average Score", 390, y + 5, { width: 140, align: "center" });
        doc.y = y + 20;
      };

      drawSubHeader();

      subjectPerformance.forEach((sp, i) => {
        if (doc.y + 20 > PAGE_BOTTOM) {
          drawFooter();
          doc.addPage();
          drawSubHeader();
        }

        const subY = doc.y;
        if (i % 2 === 1) doc.rect(50, subY, 495, 20).fill("#F8FAFC");
        doc.fontSize(9).fillColor("#1E293B").font("Helvetica")
          .text(sp.subject, 60, subY + 5, { width: 220 })
          .text(`${sp.examCount}`, 280, subY + 5, { width: 100, align: "center" })
          .font("Helvetica-Bold").fillColor(sp.averagePercentage >= 70 ? "#15803D" : sp.averagePercentage >= 50 ? "#B45309" : "#B91C1C")
          .text(`${sp.averagePercentage}%`, 390, subY + 5, { width: 140, align: "center" });

        doc.rect(50, subY, 495, 20).lineWidth(0.5).strokeColor("#E2E8F0").stroke();
        doc.y = subY + 20;
      });

      doc.y = doc.y + 12;
    }

    // Detailed Exam History Table
    ensureSpace(100);
    doc.fontSize(11).fillColor("#0F3C8A").font("Helvetica-Bold").text("Detailed Exam History", 50);
    doc.moveDown(0.3);

    const drawExamTableHeader = () => {
      const y = doc.y;
      doc.rect(50, y, 495, 22).fill("#0F3C8A");
      doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold")
        .text("#", 55, y + 6, { width: 20 })
        .text("Date", 75, y + 6, { width: 65 })
        .text("Subject", 140, y + 6, { width: 140 })
        .text("Type", 280, y + 6, { width: 45, align: "center" })
        .text("Marks", 325, y + 6, { width: 60, align: "center" })
        .text("%", 385, y + 6, { width: 45, align: "center" })
        .text("Grade", 430, y + 6, { width: 45, align: "center" })
        .text("Status", 475, y + 6, { width: 65, align: "center" });
      doc.y = y + 22;
    };

    drawExamTableHeader();

    allExams.forEach((ex, idx) => {
      if (doc.y + 20 > PAGE_BOTTOM) {
        drawFooter();
        doc.addPage();
        drawExamTableHeader();
      }

      const tblY = doc.y;
      if (idx % 2 === 1) doc.rect(50, tblY, 495, 20).fill("#F8FAFC");

      const dateStr = new Date(ex.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const passColor = ex.status === "Pass" ? "#15803D" : "#B91C1C";

      doc.fontSize(8).fillColor("#334155").font("Helvetica")
        .text(`${idx + 1}`, 55, tblY + 5, { width: 20 })
        .text(dateStr, 75, tblY + 5, { width: 65 })
        .text(ex.subject || "General", 140, tblY + 5, { width: 140 })
        .text(ex.examType?.toUpperCase() || "OFFLINE", 280, tblY + 5, { width: 45, align: "center" })
        .text(`${ex.marksObtained} / ${ex.totalMarks}`, 325, tblY + 5, { width: 60, align: "center" })
        .font("Helvetica-Bold").text(`${ex.percentage}%`, 385, tblY + 5, { width: 45, align: "center" })
        .text(ex.grade || "N/A", 430, tblY + 5, { width: 45, align: "center" })
        .fillColor(passColor).text(ex.status || "Pass", 475, tblY + 5, { width: 65, align: "center" });

      doc.rect(50, tblY, 495, 20).lineWidth(0.5).strokeColor("#E2E8F0").stroke();
      doc.y = tblY + 20;
    });

    doc.y = doc.y + 20;

    // Signatures Block
    ensureSpace(90);
    const sigY = doc.y + 45;

    if (fs.existsSync(authSignImg)) {
      try { doc.image(authSignImg, 60, sigY - 45, { height: 40 }); } catch (e) { console.error("Sign image error:", e.message); }
    }
    doc.moveTo(50, sigY).lineTo(190, sigY).strokeColor("#94A3B8").lineWidth(1).stroke();
    doc.fontSize(8).fillColor("#64748B").font("Helvetica").text("Authorized Signatory", 50, sigY + 5, { width: 140, align: "center" });

    if (fs.existsSync(authStampImg)) {
      try { doc.image(authStampImg, 240, sigY - 50, { height: 50 }); } catch (e) { console.error("Stamp image error:", e.message); }
    }
    doc.moveTo(230, sigY).lineTo(370, sigY).strokeColor("#94A3B8").lineWidth(1).stroke();
    doc.fontSize(8).fillColor("#64748B").font("Helvetica").text("Authorized Stamp", 230, sigY + 5, { width: 140, align: "center" });

    doc.moveTo(410, sigY).lineTo(550, sigY).strokeColor("#94A3B8").lineWidth(1).stroke();
    doc.fontSize(8).fillColor("#64748B").font("Helvetica").text("Parents Signature", 410, sigY + 5, { width: 140, align: "center" });

    drawFooter();
    doc.end();
  } catch (err) {
    console.error("Error generating exam report PDF:", err);
    res.status(500).json({ message: "Failed to generate exam report PDF", error: err.message });
  }
};


