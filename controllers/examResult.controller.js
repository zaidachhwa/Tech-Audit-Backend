import ExamResult from "../models/examResult.model.js";
import Exam from "../models/exam.model.js";
import Student from "../models/student.model.js";

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

// Get results for a specific batch (Admin/Teacher view)
// This will fetch exams for the batch, and the results for those exams.
export const getResultsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // Find all exams for this batch
    const exams = await Exam.find({ batch: batchId }).sort({ date: -1 });
    const examIds = exams.map(e => e._id);

    // Find all students in this batch
    const students = await Student.find({ batch: batchId }).select("name email batch_no _id");

    // Find all results for these exams
    const results = await ExamResult.find({ exam: { $in: examIds } });

    res.status(200).json({
      exams,
      students,
      results
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get results for a specific student (Student Dashboard view)
export const getStudentResults = async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const results = await ExamResult.find({ student: studentId })
      .populate("exam", "subject date examType")
      .sort({ createdAt: -1 });

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get leaderboard for a specific exam
export const getLeaderboard = async (req, res) => {
  try {
    const { examId } = req.params;

    const results = await ExamResult.find({ exam: examId })
      .populate("student", "name email")
      .sort({ marksObtained: -1 });

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
