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
  uploadStudentPhoto,
} from "../controllers/student.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerStudent);
router.post("/login", loginStudent);

// self routes (student authenticated)
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.patch("/me/photo", verifyToken, uploadStudentPhoto);

// ADMIN protected routes
router.get("/list", verifyToken, getAllStudents);
router.get("/:id", verifyToken, isAdmin, getStudentById);
router.patch("/update/:id", verifyToken, isAdmin, updateStudent);
router.patch("/:id/photo", verifyToken, isAdmin, uploadStudentPhoto);
router.delete("/delete/:id", verifyToken, isAdmin, deleteStudent);

export default router;
