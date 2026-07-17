import express from "express";
import {
  createSyllabus,
  getAllSyllabi,
  getSyllabusById,
  assignSyllabusToBatch,
  assignTeacherToSyllabus,
  unassignTeacherFromSyllabus,
  getBatchSyllabi,
  deleteBatchSyllabus,
  getBatchesWithSyllabi,
  getAssignedSyllabiForTeacher,
  updateSyllabus,
  deleteSyllabus,
} from "../controllers/syllabus.controller.js";
import {
  createLecture,
  updateLecture,
  deleteLecture,
  assignTeacherToBatchLecture,
  getBatchLectures,
  getTeacherLectures,
  updateLectureStatus,
  addLectureRemark,
  getSubjectProgress,
  scheduleLecture
} from "../controllers/lecture.controller.js";
import {
  verifyToken,
  isAdmin,
  isTeacher,
  isAdminOrTeacher,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== ADMIN - SYLLABUS TEMPLATE MANAGEMENT =====
router.post("/create", verifyToken, isAdminOrTeacher, createSyllabus);
router.get("/all", verifyToken, isAdmin, getAllSyllabi);
router.get("/template/:syllabusId", verifyToken, isAdmin, getSyllabusById);
router.put("/template/:syllabusId", verifyToken, isAdminOrTeacher, updateSyllabus);
router.delete("/template/:syllabusId", verifyToken, isAdminOrTeacher, deleteSyllabus);

// ===== ADMIN - BATCH SYLLABUS ASSIGNMENT =====
router.post("/assign-to-batch", verifyToken, isAdminOrTeacher, assignSyllabusToBatch);
router.patch("/:syllabusId/assign-teacher", verifyToken, isAdmin, assignTeacherToSyllabus);
router.patch("/:syllabusId/unassign-teacher", verifyToken, isAdmin, unassignTeacherFromSyllabus);
router.get("/batch-instances", verifyToken, isAdmin, getBatchSyllabi);
router.delete("/batch-syllabus/:batchSyllabusId", verifyToken, isAdmin, deleteBatchSyllabus);
router.get("/batches-with-syllabi", verifyToken, isAdmin, getBatchesWithSyllabi);

// ===== TEACHER - ASSIGNED SYLLABI =====
router.get("/assigned-syllabi", verifyToken, isTeacher, getAssignedSyllabiForTeacher);

// ===== BACKWARDS COMPATIBILITY (TOPICS MAP TO LECTURES) =====
router.post("/topic", verifyToken, isAdminOrTeacher, createLecture);
router.put("/topic/:topicId", verifyToken, isAdminOrTeacher, updateLecture);
router.delete("/topic/:topicId", verifyToken, isAdminOrTeacher, deleteLecture);
router.patch("/topic/:topicId/schedule", verifyToken, isAdmin, scheduleLecture);
router.post("/assign-teacher", verifyToken, isAdmin, assignTeacherToBatchLecture);
router.patch("/assign-topic", verifyToken, isAdmin, assignTeacherToBatchLecture);
router.get("/batch-topics", verifyToken, getBatchLectures);
router.get("/batch-topics-teacher", verifyToken, isTeacher, getBatchLectures);
router.get("/my-topics", verifyToken, isTeacher, getTeacherLectures);
router.patch("/topic/:topicId/complete", verifyToken, isTeacher, updateLectureStatus);
router.patch("/topic/:topicId/status", verifyToken, isTeacher, updateLectureStatus);
router.patch("/topic/:topicId/remark", verifyToken, isTeacher, addLectureRemark);
router.get("/progress/:syllabusId", verifyToken, getSubjectProgress);

export default router;
