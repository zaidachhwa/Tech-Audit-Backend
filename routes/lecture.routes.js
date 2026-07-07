import express from "express";
import {
  getLectures,
  getLectureById,
  createLecture,
  updateLecture,
  deleteLecture,
  addSubLecture,
  getSubLectures,
  updateSubLectureById,
  deleteSubLectureById,
  getReferenceLectures,
  createReferenceLecture,
  createTeacherMapping,
  getTeacherMappings,
  updateTeacherMapping,
  deleteTeacherMapping,
  getTeacherLectures,
  updateLectureStatus,
  getSubjectProgress,
  getSubjectProgressFormatted,
  getAdminDashboardStats,
  getLectureTypes,
  getHomeworkStatuses
} from "../controllers/lecture.controller.js";
import {
  verifyToken,
  isAdmin,
  isTeacher,
  isAdminOrTeacher
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== LECTURE MANAGEMENT =====
router.get("/lectures", verifyToken, getLectures);
router.get("/lectures/:id", verifyToken, getLectureById);
router.post("/lectures", verifyToken, isAdminOrTeacher, createLecture);
router.put("/lectures/:id", verifyToken, isAdminOrTeacher, updatedLectureShim);
router.delete("/lectures/:id", verifyToken, isAdminOrTeacher, deleteLecture);

// PUT update lecture shim for compatibility with older routing namespaces
function updatedLectureShim(req, res, next) {
  req.params.lectureId = req.params.id;
  return updateLecture(req, res, next);
}

// ===== SUB-LECTURES =====
router.post("/lectures/:lectureId/sub-lectures", verifyToken, isAdminOrTeacher, addSubLecture);
router.get("/lectures/:lectureId/sub-lectures", verifyToken, getSubLectures);
router.put("/sub-lectures/:id", verifyToken, isAdminOrTeacher, updateSubLectureById);
router.delete("/sub-lectures/:id", verifyToken, isAdminOrTeacher, deleteSubLectureById);

// ===== REFERENCE LECTURES =====
router.get("/reference-lectures", verifyToken, getReferenceLectures);
router.post("/reference-lectures", verifyToken, isAdminOrTeacher, createReferenceLecture);

// ===== TEACHER LECTURE MAPPING =====
router.post("/teacher-lecture-mapping", verifyToken, isAdmin, createTeacherMapping);
router.get("/teacher-lecture-mapping", verifyToken, isAdmin, getTeacherMappings);
router.put("/teacher-lecture-mapping/:id", verifyToken, isAdmin, updateTeacherMapping);
router.delete("/teacher-lecture-mapping/:id", verifyToken, isAdmin, deleteTeacherMapping);

// ===== TEACHER SPECIFIC =====
router.get("/teacher/my-lectures", verifyToken, isTeacher, getTeacherLectures);
router.patch("/teacher/lecture/:lectureId/complete", verifyToken, isTeacher, updateLectureStatus);
router.get("/teacher/subject-progress", verifyToken, isTeacher, getSubjectProgress);

// ===== SUBJECT PROGRESS =====
router.get("/progress/subject", verifyToken, getSubjectProgressFormatted);

// ===== ADMIN DASHBOARD =====
router.get("/admin/dashboard", verifyToken, getAdminDashboardStats);

// ===== MASTER DATA =====
router.get("/master/lecture-types", getLectureTypes);
router.get("/master/homework-status", getHomeworkStatuses);

export default router;
