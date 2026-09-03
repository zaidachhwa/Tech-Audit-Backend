import express from "express";
import {
  getStudentExamStatus,
  startOrResumeAttempt,
  saveAnswer,
  syncTimer,
  logTabSwitch,
  submitAttempt,
  getStudentResultDetail
} from "../controllers/onlineExam.controller.js";
import { verifyToken, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Student Exam Routes
router.get("/status/:examId", isStudent, getStudentExamStatus);
router.get("/result-detail/:examId", isStudent, getStudentResultDetail);
router.post("/start/:examId", isStudent, startOrResumeAttempt);
router.post("/save-answer", isStudent, saveAnswer);
router.post("/sync-timer", isStudent, syncTimer);
router.post("/tab-switch", isStudent, logTabSwitch);
router.post("/submit", isStudent, submitAttempt);

export default router;
