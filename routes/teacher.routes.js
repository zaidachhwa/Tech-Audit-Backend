import express from "express";
import {
  registerTeacher,
  loginTeacher,
  approveTeacher,
  rejectTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getTeacherProfile,
  changeTeacherPassword,
  getTeacherStats,
  updateTeacherProfile,
  getTeacherById,
  getTeacherProgressForAdmin,
  uploadTeacherPhoto,
} from "../controllers/teacher.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";
import { toggleTeacherStatus } from "../controllers/teacher.controller.js";
const router = express.Router();

router.post("/register", registerTeacher);


router.get("/list", verifyToken, isAdmin, getAllTeachers);
router.patch("/approve/:teacherId", verifyToken, isAdmin, approveTeacher);
router.patch("/reject/:teacherId", verifyToken, isAdmin, rejectTeacher);

router.patch("/update/:teacherId", verifyToken, isAdmin, updateTeacher);
router.delete("/delete/:teacherId", verifyToken, isAdmin, deleteTeacher);

router.get("/profile", verifyToken, getTeacherProfile);
router.patch("/profile", verifyToken, updateTeacherProfile);
router.patch("/change-password", verifyToken, changeTeacherPassword);
router.get("/stats", verifyToken, getTeacherStats);

// ===== ADMIN: SINGLE TEACHER PROFILE & PROGRESS =====
// NOTE: these must be declared AFTER fixed-path routes to avoid conflicts
router.get("/:teacherId", verifyToken, isAdmin, getTeacherById);
router.get("/:teacherId/progress", verifyToken, isAdmin, getTeacherProgressForAdmin);
router.patch("/:teacherId/photo", verifyToken, isAdmin, uploadTeacherPhoto);

router.patch("/toggle/:id", toggleTeacherStatus);
export default router;
