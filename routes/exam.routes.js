import express from "express";
import { createExam, getExams, deleteExam } from "../controllers/exam.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

// Allow admin and teacher to create and delete exams
router.post("/", isAdminOrTeacher, createExam);
router.delete("/:id", isAdminOrTeacher, deleteExam);

// Everyone can view exams (students too)
router.get("/", getExams);

export default router;
