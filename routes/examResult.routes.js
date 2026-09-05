import express from "express";
import {
  saveOrUpdateResult,
  saveOrUpdateBatchResults,
  getResultsByBatch,
  getStudentResults,
  getLeaderboard,
  getStudentExamReport,
  downloadStudentExamReportPdf,
  saveStudentExamReport
} from "../controllers/examResult.controller.js";
import { verifyToken, isAdminOrTeacher, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin / Teacher Routes
router.post("/", verifyToken, isAdminOrTeacher, saveOrUpdateResult);
router.post("/batch-save", verifyToken, isAdminOrTeacher, saveOrUpdateBatchResults);
router.get("/batch/:batchId", verifyToken, isAdminOrTeacher, getResultsByBatch);
router.get("/leaderboard/:examId", verifyToken, getLeaderboard); // could be accessible to students too? let's keep it open to authenticated users

// Report Routes
router.get("/student/:studentId/report", verifyToken, getStudentExamReport);
router.post("/student/:studentId/report/save", verifyToken, saveStudentExamReport);
router.get("/student/:studentId/report/pdf", verifyToken, downloadStudentExamReportPdf);

// Student / Portal Routes
router.get("/my-results", verifyToken, getStudentResults);

export default router;

