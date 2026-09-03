import Exam from "../models/exam.model.js";

export const createExam = async (req, res) => {
  try {
    const {
      subject,
      date,
      examType,
      batch,
      questionPaper,
      startTime,
      endTime,
      durationMinutes,
      totalMarks,
      passingMarks,
      instructions,
      questions
    } = req.body;
    
    if (!subject || !date || !examType || !batch) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const examDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (examDate < today) {
      return res.status(400).json({ message: "Exam date cannot be in the past" });
    }

    if (examType === "online") {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "At least one question is required for online exams" });
      }
    }

    const exam = new Exam({
      subject,
      date,
      examType,
      batch,
      questionPaper,
      startTime: startTime || "10:00",
      endTime: endTime || "",
      durationMinutes: durationMinutes ? Number(durationMinutes) : 60,
      totalMarks: totalMarks ? Number(totalMarks) : (questions ? questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0) : 100),
      passingMarks: passingMarks ? Number(passingMarks) : 40,
      instructions: instructions || "",
      questions: questions || [],
      createdBy: req.user.id || req.user._id,
      createdByRole: req.user.role
    });

    await exam.save();
    res.status(201).json({ message: "Exam scheduled successfully", exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getExams = async (req, res) => {
  try {
    const filter = {};
    if (req.query.batch) {
      filter.batch = req.query.batch;
    }

    const exams = await Exam.find(filter)
      .populate("batch", "batch_name batch_no")
      .sort({ date: 1 })
      .lean();
      
    // If student, sanitize correct answers from questions
    const isStudent = req.user && req.user.role === "student";
    const sanitizedExams = exams.map((exam) => {
      if (isStudent && exam.questions && Array.isArray(exam.questions)) {
        exam.questions = exam.questions.map((q) => {
          const { correctAnswer, ...rest } = q;
          return rest;
        });
      }
      return exam;
    });

    res.status(200).json(sanitizedExams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("batch", "batch_name batch_no")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const isStudent = req.user && req.user.role === "student";
    if (isStudent && exam.questions && Array.isArray(exam.questions)) {
      exam.questions = exam.questions.map((q) => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    res.status(200).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const allowedUpdates = [
      "subject",
      "date",
      "examType",
      "batch",
      "startTime",
      "endTime",
      "durationMinutes",
      "totalMarks",
      "passingMarks",
      "instructions",
      "questions",
      "questionPaper"
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        exam[field] = req.body[field];
      }
    });

    await exam.save();
    res.status(200).json({ message: "Exam updated successfully", exam });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    
    await Exam.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
