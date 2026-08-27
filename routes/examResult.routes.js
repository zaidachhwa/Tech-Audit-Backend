import express from "express";
import {
  saveOrUpdateResult,
  getResultsByBatch,
  getStudentResults,
  getLeaderboard
} from "../controllers/examResult.controller.js";
import { verifyToken, isAdminOrTeacher, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin / Teacher Routes
router.post("/", verifyToken, isAdminOrTeacher, saveOrUpdateResult);
router.get("/batch/:batchId", verifyToken, isAdminOrTeacher, getResultsByBatch);
router.get("/leaderboard/:examId", verifyToken, getLeaderboard); // could be accessible to students too? let's keep it open to authenticated users

// Student Routes
router.get("/my-results", verifyToken, isStudent, getStudentResults);

export default router;
