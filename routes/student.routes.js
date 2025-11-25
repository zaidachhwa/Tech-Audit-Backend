// routes/students.routes.js
import { Router } from "express";
import {
  registerStudent,
  loginStudent,
  getAllStudents,
  deleteStudent,
  getStudentById,
  updateStudent,
  getMe,
  updateMe,
} from "../controllers/student.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerStudent);
router.post("/login", loginStudent);

// self routes (student authenticated)
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);

// ADMIN protected routes
router.get("/list", verifyToken, isAdmin, getAllStudents);
router.get("/:id", verifyToken, isAdmin, getStudentById);
router.patch("/update/:id", verifyToken, isAdmin, updateStudent);
router.delete("/delete/:id", verifyToken, isAdmin, deleteStudent);

export default router;
