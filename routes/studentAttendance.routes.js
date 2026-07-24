import { Router } from "express";
import {
  studentPunchIn,
  studentPunchOut,
  getTodayStatus,
  getMyAttendance,
  getStudentAttendanceLogs,
  adminEditPunchTime,
} from "../controllers/studentAttendance.controller.js";
import { verifyToken, isStudent, isAdminOrTeacher, isAdmin } from "../middleware/auth.middleware.js";
import { uploadNotes } from "../middleware/upload.js";

const router = Router();

// Student routes
router.post("/punch-in", verifyToken, isStudent, uploadNotes.single("photo"), studentPunchIn);
router.post("/punch-out", verifyToken, isStudent, uploadNotes.single("photo"), studentPunchOut);
router.get("/today", verifyToken, isStudent, getTodayStatus);
router.get("/my", verifyToken, isStudent, getMyAttendance);

// Teacher/Admin routes
router.get("/logs", verifyToken, isAdminOrTeacher, getStudentAttendanceLogs);

// Admin-only routes
router.patch("/:id/edit", verifyToken, isAdmin, adminEditPunchTime);

export default router;
