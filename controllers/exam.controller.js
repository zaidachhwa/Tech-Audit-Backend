import Exam from "../models/exam.model.js";

export const createExam = async (req, res) => {
  try {
    const { subject, date, examType, batch, questionPaper } = req.body;
    
    if (!subject || !date || !examType || !batch) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const examDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (examDate < today) {
      return res.status(400).json({ message: "Exam date cannot be in the past" });
    }

    const exam = new Exam({
      subject,
      date,
      examType,
      batch,
      questionPaper,
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
      .sort({ date: 1 });
      
    res.status(200).json(exams);
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
