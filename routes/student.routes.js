import { Router } from "express";
import {
  registerStudent,
  loginStudent,
  getAllStudents,
  deleteStudent,
  getStudentById,
} from "../controllers/student.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/register", registerStudent);
router.post("/login", loginStudent);
router.get("/list", verifyToken, isAdmin, getAllStudents);
router.get("/:id", verifyToken, isAdmin, getStudentById);
router.delete("/delete/:id", verifyToken, isAdmin, deleteStudent);

export default router;
