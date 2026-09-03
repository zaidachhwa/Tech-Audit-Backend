import Exam from "../models/exam.model.js";
import ExamAttempt from "../models/examAttempt.model.js";
import ExamResult from "../models/examResult.model.js";
import Student from "../models/student.model.js";
import mongoose from "mongoose";

// Helper to sanitize questions for students (removes correctAnswer)
const sanitizeQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    const qObj = q.toObject ? q.toObject() : { ...q };
    delete qObj.correctAnswer;
    return qObj;
  });
};

// Internal auto-submission helper
const finalizeAttempt = async (attempt, exam, isAuto = false) => {
  if (attempt.status === "completed" || attempt.status === "auto_submitted") {
    return attempt;
  }

  let totalScore = 0;
  let totalPossibleMarks = 0;
  const questionsMap = new Map();
  (exam.questions || []).forEach((q) => {
    questionsMap.set(q._id.toString(), q);
    totalPossibleMarks += q.marks || 1;
  });

  const updatedAnswers = (attempt.answers || []).map((userAns) => {
    const question = questionsMap.get(userAns.questionId.toString());
    let isCorrect = false;
    let marksAwarded = 0;

    if (question && question.correctAnswer) {
      const uAns = (userAns.answer || "").trim().toLowerCase();
      const cAns = (question.correctAnswer || "").trim().toLowerCase();

      // Direct match or Option Letter Match (e.g. user answered "C" or "Option C" or exact option text)
      if (uAns === cAns) {
        isCorrect = true;
      } else if (question.options && question.options.length > 0) {
        // Check if correct answer is option letter e.g., 'A', 'B', 'C', 'D'
        const letterIndex = ["a", "b", "c", "d"].indexOf(cAns);
        if (letterIndex >= 0 && question.options[letterIndex]) {
          const optionText = question.options[letterIndex].trim().toLowerCase();
          if (uAns === optionText || uAns === `option ${cAns}`) {
            isCorrect = true;
          }
        }
        // Vice versa: if user selected "C" and correct answer is option[2]
        const userLetterIndex = ["a", "b", "c", "d"].indexOf(uAns);
        if (userLetterIndex >= 0 && question.options[userLetterIndex]) {
          const optionText = question.options[userLetterIndex].trim().toLowerCase();
          if (optionText === cAns) {
            isCorrect = true;
          }
        }
      }

      if (isCorrect) {
        marksAwarded = question.marks || 1;
        totalScore += marksAwarded;
      }
    }

    return {
      questionId: userAns.questionId,
      answer: userAns.answer,
      isCorrect,
      marksAwarded
    };
  });

  const totalExamMarks = exam.totalMarks || totalPossibleMarks || 100;
  const percentage = totalExamMarks > 0 ? Math.round((totalScore / totalExamMarks) * 100) : 0;
  
  let passThresholdPercentage = 40;
  if (exam.passingMarks !== undefined && exam.passingMarks !== null && exam.passingMarks > 0) {
    if (exam.passingMarks <= totalExamMarks) {
      passThresholdPercentage = (exam.passingMarks / totalExamMarks) * 100;
    } else {
      passThresholdPercentage = exam.passingMarks;
    }
  }

  const status = percentage >= passThresholdPercentage ? "Pass" : "Fail";

  let grade = "F";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 50) grade = "D";

  attempt.answers = updatedAnswers;
  attempt.score = totalScore;
  attempt.totalMarks = totalExamMarks;
  attempt.percentage = percentage;
  attempt.status = isAuto ? "auto_submitted" : "completed";
  attempt.submittedAt = new Date();

  await attempt.save();

  // Store in existing ExamResult collection
  await ExamResult.findOneAndUpdate(
    { exam: exam._id, student: attempt.student },
    {
      exam: exam._id,
      student: attempt.student,
      marksObtained: totalScore,
      totalMarks: totalExamMarks,
      grade,
      status,
      remarks: `Online Exam (${isAuto ? "Auto-submitted" : "Submitted"}) on ${new Date().toLocaleDateString()}`,
      createdBy: exam.createdBy,
      createdByRole: exam.createdByRole
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return attempt;
};

// 1. Get Exam Status for Student
export const getStudentExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id || req.user._id;

    const exam = await Exam.findById(examId).populate("batch", "batch_name batch_no");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.examType !== "online") {
      return res.status(400).json({ message: "Not an online exam" });
    }

    const attempt = await ExamAttempt.findOne({ exam: examId, student: studentId });

    // Server scheduling calculation
    const serverNow = new Date();
    const examDateStr = new Date(exam.date).toISOString().split("T")[0];
    const startTimeStr = exam.startTime || "00:00";
    const startDateTime = new Date(`${examDateStr}T${startTimeStr}:00`);

    let windowStatus = "available";
    if (serverNow < startDateTime) {
      windowStatus = "upcoming";
    }

    let remainingSeconds = 0;
    if (attempt) {
      if (attempt.status === "completed" || attempt.status === "auto_submitted") {
        windowStatus = "completed";
      } else if (attempt.status === "in_progress") {
        remainingSeconds = Math.max(0, Math.floor((new Date(attempt.endTime).getTime() - serverNow.getTime()) / 1000));
        if (remainingSeconds <= 0) {
          await finalizeAttempt(attempt, exam, true);
          windowStatus = "completed";
        } else {
          windowStatus = "in_progress";
        }
      }
    }

    res.status(200).json({
      exam: {
        _id: exam._id,
        subject: exam.subject,
        date: exam.date,
        startTime: exam.startTime,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        instructions: exam.instructions,
        batch: exam.batch,
        totalQuestions: exam.questions ? exam.questions.length : 0
      },
      windowStatus,
      attempt: attempt ? {
        _id: attempt._id,
        status: attempt.status,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt
      } : null,
      remainingSeconds,
      serverTime: serverNow
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Start or Resume Attempt
export const startOrResumeAttempt = async (req, res) => {
  try {
    const { examId } = req.params;
    const { sessionId } = req.body;
    const studentId = req.user.id || req.user._id;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID required" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.examType !== "online") {
      return res.status(400).json({ message: "This exam is not an online exam" });
    }

    // Scheduling check
    const serverNow = new Date();
    const examDateStr = new Date(exam.date).toISOString().split("T")[0];
    const startTimeStr = exam.startTime || "00:00";
    const startDateTime = new Date(`${examDateStr}T${startTimeStr}:00`);

    if (serverNow < startDateTime) {
      return res.status(400).json({ message: `Exam is not accessible yet. It starts at ${startTimeStr} on ${examDateStr}` });
    }

    let attempt = await ExamAttempt.findOne({ exam: examId, student: studentId });

    if (attempt) {
      if (attempt.status === "completed" || attempt.status === "auto_submitted") {
        return res.status(400).json({ message: "Exam has already been submitted", attempt });
      }

      const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.endTime).getTime() - serverNow.getTime()) / 1000));

      if (remainingSeconds <= 0) {
        attempt = await finalizeAttempt(attempt, exam, true);
        return res.status(400).json({ message: "Exam time has expired", attempt });
      }

      // Resume attempt - update active session token
      attempt.activeSessionId = sessionId;
      await attempt.save();
    } else {
      // Create new attempt
      const durationMs = (exam.durationMinutes || 60) * 60 * 1000;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationMs);

      attempt = new ExamAttempt({
        exam: exam._id,
        student: studentId,
        batch: exam.batch,
        startTime,
        endTime,
        status: "in_progress",
        activeSessionId: sessionId,
        answers: []
      });

      await attempt.save();
    }

    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.endTime).getTime() - serverNow.getTime()) / 1000));
    const sanitizedQuest = sanitizeQuestions(exam.questions);

    res.status(200).json({
      attemptId: attempt._id,
      exam: {
        _id: exam._id,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        instructions: exam.instructions,
        questions: sanitizedQuest
      },
      savedAnswers: attempt.answers,
      remainingSeconds,
      activeSessionId: attempt.activeSessionId,
      status: attempt.status
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Save Answer in Real-time
export const saveAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, answer, sessionId } = req.body;
    const studentId = req.user.id || req.user._id;

    if (!attemptId || !questionId || !sessionId) {
      return res.status(400).json({ message: "Missing attemptId, questionId or sessionId" });
    }

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Unauthorized attempt access" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "Exam is no longer active", status: attempt.status });
    }

    // Check Multi-tab session lock
    if (attempt.activeSessionId !== sessionId) {
      return res.status(403).json({ message: "Session Conflict: Exam is active in another tab or window." });
    }

    // Check server timer (with 10 sec latency buffer)
    const serverNow = new Date();
    if (serverNow.getTime() > new Date(attempt.endTime).getTime() + 10000) {
      const exam = await Exam.findById(attempt.exam);
      await finalizeAttempt(attempt, exam, true);
      return res.status(400).json({ message: "Exam duration expired. Attempt auto-submitted.", expired: true });
    }

    // Update answer
    const existingIndex = attempt.answers.findIndex((a) => a.questionId.toString() === questionId.toString());
    if (existingIndex >= 0) {
      attempt.answers[existingIndex].answer = answer;
    } else {
      attempt.answers.push({ questionId, answer });
    }

    await attempt.save();

    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.endTime).getTime() - serverNow.getTime()) / 1000));
    res.status(200).json({ message: "Answer saved", remainingSeconds });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Sync Server Timer
export const syncTimer = async (req, res) => {
  try {
    const { attemptId, sessionId } = req.body;
    const studentId = req.user.id || req.user._id;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Unauthorized attempt access" });
    }

    const serverNow = new Date();
    const remainingSeconds = Math.max(0, Math.floor((new Date(attempt.endTime).getTime() - serverNow.getTime()) / 1000));

    if (remainingSeconds <= 0 && attempt.status === "in_progress") {
      const exam = await Exam.findById(attempt.exam);
      await finalizeAttempt(attempt, exam, true);
      return res.status(200).json({ status: "auto_submitted", remainingSeconds: 0, expired: true });
    }

    res.status(200).json({
      status: attempt.status,
      remainingSeconds,
      serverTime: serverNow
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Log Tab Switch
export const logTabSwitch = async (req, res) => {
  try {
    const { attemptId, sessionId } = req.body;
    const attempt = await ExamAttempt.findById(attemptId);
    if (attempt && attempt.status === "in_progress") {
      attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
      await attempt.save();
    }
    res.status(200).json({ message: "Logged", count: attempt ? attempt.tabSwitchCount : 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Submit Exam
export const submitAttempt = async (req, res) => {
  try {
    const { attemptId, sessionId } = req.body;
    const studentId = req.user.id || req.user._id;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Unauthorized attempt access" });
    }

    const exam = await Exam.findById(attempt.exam);
    if (!exam) {
      return res.status(404).json({ message: "Exam model missing" });
    }

    const finalAttempt = await finalizeAttempt(attempt, exam, false);

    res.status(200).json({
      message: "Exam submitted successfully",
      result: {
        score: finalAttempt.score,
        totalMarks: finalAttempt.totalMarks,
        percentage: finalAttempt.percentage,
        status: finalAttempt.status,
        submittedAt: finalAttempt.submittedAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. Get Result Detail for Completed Online Exam
export const getStudentResultDetail = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id || req.user._id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const attempt = await ExamAttempt.findOne({ exam: examId, student: studentId });
    if (!attempt || (attempt.status !== "completed" && attempt.status !== "auto_submitted")) {
      return res.status(400).json({ message: "Exam attempt not completed yet" });
    }

    const result = await ExamResult.findOne({ exam: examId, student: studentId });

    // Map questions with student answers
    const questionsMap = new Map();
    (exam.questions || []).forEach((q) => {
      questionsMap.set(q._id.toString(), q);
    });

    const breakdown = (attempt.answers || []).map((ans) => {
      const q = questionsMap.get(ans.questionId.toString());
      return {
        questionId: ans.questionId,
        questionText: q ? q.questionText : "Question",
        questionType: q ? q.questionType : "mcq",
        options: q ? q.options : [],
        correctAnswer: q ? q.correctAnswer : "",
        userAnswer: ans.answer,
        isCorrect: ans.isCorrect,
        marksAwarded: ans.marksAwarded,
        totalMarks: q ? q.marks : 1
      };
    });

    let passThresholdPct = 40;
    const totMarks = attempt.totalMarks || exam.totalMarks || 100;
    if (exam.passingMarks > 0) {
      if (exam.passingMarks <= totMarks) {
        passThresholdPct = (exam.passingMarks / totMarks) * 100;
      } else {
        passThresholdPct = exam.passingMarks;
      }
    }
    const computedStatus = attempt.percentage >= passThresholdPct ? "Pass" : "Fail";

    if (result && result.status !== computedStatus) {
      result.status = computedStatus;
      await result.save();
    }

    res.status(200).json({
      exam: {
        _id: exam._id,
        subject: exam.subject,
        date: exam.date,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks
      },
      attempt: {
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
        status: computedStatus,
        grade: result ? result.grade : (attempt.percentage >= 90 ? "A+" : attempt.percentage >= 80 ? "A" : attempt.percentage >= 70 ? "B" : attempt.percentage >= 60 ? "C" : attempt.percentage >= 50 ? "D" : "F")
      },
      breakdown
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
