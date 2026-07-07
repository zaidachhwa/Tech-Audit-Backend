import express from "express";
import {
  createHomework,
  getHomework,
  getHomeworkById,
  updateHomework,
  deleteHomework,
  getMyHomework,
  submitHomework,
  updateSubmission,
  getStudentHomeworkHistory,
  getPendingHomework,
  approveHomework,
  rejectHomework
} from "../controllers/homework.controller.js";
import { verifyToken, isAdminOrTeacher, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== HOMEWORK (ADMIN/TEACHER) =====
router.post("/homework", verifyToken, isAdminOrTeacher, createHomework);
router.get("/homework", verifyToken, getHomework);
router.get("/homework/pending", verifyToken, isAdminOrTeacher, getPendingHomework);
router.get("/homework/:id", verifyToken, getHomeworkById);
router.put("/homework/:id", verifyToken, isAdminOrTeacher, updateHomework);
router.patch("/homework/:id", verifyToken, isAdminOrTeacher, updateHomework);
router.delete("/homework/:id", verifyToken, isAdminOrTeacher, deleteHomework);

// ===== STUDENT HOMEWORK =====
router.get("/student/homework", verifyToken, isStudent, getMyHomework);
router.get("/student/homework/history", verifyToken, isStudent, getStudentHomeworkHistory);
router.post("/student/homework/:homeworkId/submit", verifyToken, isStudent, submitHomework);

// ===== STUDENT HOMEWORK V2 SPEC =====
router.get("/student-homework", verifyToken, isStudent, getMyHomework);
router.post("/student-homework", verifyToken, isStudent, submitHomework);
router.patch("/student-homework/:id", verifyToken, isStudent, updateSubmission);

// ===== HOMEWORK APPROVAL =====
router.patch("/homework/:submissionId/approve", verifyToken, isAdminOrTeacher, approveHomework);
router.patch("/homework/:submissionId/reject", verifyToken, isAdminOrTeacher, rejectHomework);

export default router;
