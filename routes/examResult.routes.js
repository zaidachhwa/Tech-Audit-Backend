import express from "express";
import {
  saveOrUpdateResult,
  saveOrUpdateBatchResults,
  getResultsByBatch,
  getStudentResults,
  getLeaderboard
} from "../controllers/examResult.controller.js";
import { verifyToken, isAdminOrTeacher, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin / Teacher Routes
router.post("/", verifyToken, isAdminOrTeacher, saveOrUpdateResult);
router.post("/batch-save", verifyToken, isAdminOrTeacher, saveOrUpdateBatchResults);
router.get("/batch/:batchId", verifyToken, isAdminOrTeacher, getResultsByBatch);
router.get("/leaderboard/:examId", verifyToken, getLeaderboard); // could be accessible to students too? let's keep it open to authenticated users

// Student / Portal Routes
router.get("/my-results", verifyToken, getStudentResults);

export default router;
