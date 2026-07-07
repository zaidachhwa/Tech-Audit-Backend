import express from "express";
import {
  getAdminDashboard,
  getTeacherDashboard,
  getStudentDashboard
} from "../controllers/dashboard.controller.js";
import { verifyToken, isAdmin, isTeacher, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/admin", verifyToken, isAdmin, getAdminDashboard);
router.get("/teacher", verifyToken, isTeacher, getTeacherDashboard);
router.get("/student", verifyToken, isStudent, getStudentDashboard);

export default router;
