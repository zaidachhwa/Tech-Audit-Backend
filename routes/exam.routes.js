import express from "express";
import { createExam, getExams, getExamById, updateExam, deleteExam } from "../controllers/exam.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Allow admin and teacher to create, update and delete exams
router.post("/", isAdminOrTeacher, createExam);
router.put("/:id", isAdminOrTeacher, updateExam);
router.delete("/:id", isAdminOrTeacher, deleteExam);

// Everyone can view exams (students too)
router.get("/", getExams);
router.get("/:id", getExamById);

export default router;
