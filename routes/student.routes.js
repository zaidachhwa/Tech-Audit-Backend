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
import { bulkImportStudents } from "../controllers/studentImport.controller.js";
import { verifyToken, isAdmin, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerStudent);
router.post("/login", loginStudent);

// self routes (student authenticated)
router.get("/me", verifyToken, getMe);
router.patch("/me", verifyToken, updateMe);
router.patch("/me/photo", verifyToken, uploadStudentPhoto);

// ADMIN/TEACHER protected routes
router.post("/bulk-import", verifyToken, isAdmin, bulkImportStudents);
router.get("/list", verifyToken, getAllStudents);
router.get("/:id", verifyToken, isAdminOrTeacher, getStudentById);
router.patch("/update/:id", verifyToken, isAdminOrTeacher, updateStudent);
router.patch("/:id/photo", verifyToken, isAdminOrTeacher, uploadStudentPhoto);
router.delete("/delete/:id", verifyToken, isAdminOrTeacher, deleteStudent);

export default router;
