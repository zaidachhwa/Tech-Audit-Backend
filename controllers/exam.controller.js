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

export const generateAIQuestions = async (req, res) => {
  try {
    const { topic, numQuestions = 5, difficulty = "Medium", questionType = "mcq", marksPerQuestion = 1 } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: "Topic / Subject description is required for AI question generation." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured in backend environment." });
    }

    const count = Math.min(Math.max(Number(numQuestions) || 5, 1), 25);
    const marks = Number(marksPerQuestion) || 1;

    let typePrompt = "";
    if (questionType === "mcq") {
      typePrompt = "All questions must be Multiple Choice Questions (mcq) with exactly 4 options (Option A, B, C, D) and a single correct option letter ('A', 'B', 'C', or 'D').";
    } else if (questionType === "true_false") {
      typePrompt = "All questions must be True/False (true_false) with options ['True', 'False'] and correctAnswer as 'True' or 'False'.";
    } else if (questionType === "short_answer") {
      typePrompt = "All questions must be Short Answer (short_answer) with empty options array [] and a concise expected answer string as correctAnswer.";
    } else {
      typePrompt = "A balanced mix of MCQ (Multiple Choice with 4 options), True/False, and Short Answer questions.";
    }

    const prompt = `You are an expert technical examiner and syllabus question builder.
Generate exactly ${count} high-quality, professional exam questions for the topic/syllabus: "${topic.trim()}".
Difficulty level: ${difficulty}.
Marks per question: ${marks}.
Question formatting instruction: ${typePrompt}

CRITICAL REQUIREMENT:
Respond ONLY with a valid JSON array of question objects matching this exact schema:
[
  {
    "questionText": "Question string here",
    "questionType": "mcq" | "true_false" | "short_answer",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": "A" | "B" | "C" | "D" | "True" | "False" | "Expected answer string",
    "marks": ${marks}
  }
]
Do not include any intro, markdown text, wrappers outside json, or extra commentary. Output strictly valid raw JSON array.`;

    const axios = (await import("axios")).default;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ message: "No response text received from Gemini API." });
    }

    let parsedQuestions = JSON.parse(text);
    if (!Array.isArray(parsedQuestions)) {
      if (parsedQuestions.questions && Array.isArray(parsedQuestions.questions)) {
        parsedQuestions = parsedQuestions.questions;
      } else {
        return res.status(500).json({ message: "Invalid question paper structure returned by AI." });
      }
    }

    const sanitized = parsedQuestions.map((q) => ({
      questionText: String(q.questionText || "Untitled Question").trim(),
      questionType: ["mcq", "true_false", "short_answer"].includes(q.questionType) ? q.questionType : "mcq",
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [],
      correctAnswer: String(q.correctAnswer || "A").trim(),
      marks: Number(q.marks) || marks
    }));

    res.status(200).json({
      message: `Successfully generated ${sanitized.length} questions using Gemini AI!`,
      questions: sanitized
    });
  } catch (err) {
    console.error("AI Question Generation Error:", err.response?.data || err.message);
    res.status(500).json({ message: err.response?.data?.error?.message || err.message || "Failed to generate AI question paper" });
  }
};
