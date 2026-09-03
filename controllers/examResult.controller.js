import ExamResult from "../models/examResult.model.js";
import Exam from "../models/exam.model.js";
import Student from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import StudentBatchMapping from "../models/studentBatchMapping.model.js";
import mongoose from "mongoose";

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
              marksObtained: null,
              totalMarks: null,
              grade: null,
              status: "Pending",
              remarks: "Result pending"
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
