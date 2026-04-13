import express from "express";
import {
  createSyllabus,
  addTopic,
  getAllSyllabi,
  getSyllabusById,
  assignSyllabusToBatch,
  assignTeacherToBatchTopic,
  assignTeacherToTopic,
  assignTeacherToSyllabus,
  unassignTeacherFromSyllabus,
  getBatchSyllabi,
  getBatchTopics,
  getSyllabusWithProgress,
  getTeacherTopics,
  markTopicCompleted,
  updateTopicStatus,
  addTopicRemark,
  deleteBatchSyllabus,
  getBatchesWithSyllabi,
  getAssignedSyllabiForTeacher,
  updateSyllabus,
  deleteSyllabus,
  updateTopic,
  deleteTopic,
} from "../controllers/syllabus.controller.js";
import {
  verifyToken,
  isAdmin,
  isTeacher,
  isAdminOrTeacher,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== ADMIN - TEMPLATE MANAGEMENT =====
router.post("/create", verifyToken, isAdminOrTeacher, createSyllabus);
router.post("/topic", verifyToken, isAdminOrTeacher, addTopic);
router.get("/all", verifyToken, isAdmin, getAllSyllabi);
router.get("/template/:syllabusId", verifyToken, isAdmin, getSyllabusById);

// ===== ADMIN - BATCH ASSIGNMENT =====
router.post("/assign-to-batch", verifyToken, isAdminOrTeacher, assignSyllabusToBatch);
router.post("/assign-teacher", verifyToken, isAdmin, assignTeacherToBatchTopic);
router.patch("/assign-topic", verifyToken, isAdmin, assignTeacherToTopic);
router.patch("/:syllabusId/assign-teacher", verifyToken, isAdmin, assignTeacherToSyllabus);
router.patch("/:syllabusId/unassign-teacher", verifyToken, isAdmin, unassignTeacherFromSyllabus);
router.get("/batch-instances", verifyToken, isAdmin, getBatchSyllabi);
router.get("/batch-topics", verifyToken, isAdmin, getBatchTopics);
router.delete(
  "/batch-syllabus/:batchSyllabusId",
  verifyToken,
  isAdmin,
  deleteBatchSyllabus
);
router.get(
  "/batches-with-syllabi",
  verifyToken,
  isAdmin,
  getBatchesWithSyllabi
);
// ===== ADMIN - UPDATE & DELETE =====

// ✅ Update syllabus template
router.put(
  "/template/:syllabusId",
  verifyToken,
  isAdminOrTeacher,
  updateSyllabus
);

// ✅ Delete syllabus template
router.delete(
  "/template/:syllabusId",
  verifyToken,
  isAdminOrTeacher,
  deleteSyllabus
);

// ✅ Update topic
router.put(
  "/topic/:topicId",
  verifyToken,
  isAdminOrTeacher,
  updateTopic
);

// ✅ Delete topic
router.delete(
  "/topic/:topicId",
  verifyToken,
  isAdminOrTeacher,
  deleteTopic
);

// ===== ADMIN - PROGRESS TRACKING =====
router.get(
  "/progress/:syllabusId",
  verifyToken,
  isAdmin,
  getSyllabusWithProgress
);

// ===== TEACHER - TOPIC MANAGEMENT =====
router.get("/my-topics", verifyToken, isTeacher, getTeacherTopics);
router.patch(
  "/topic/:topicId/complete",
  verifyToken,
  isTeacher,
  markTopicCompleted
);
router.patch(
  "/topic/:topicId/status",
  verifyToken,
  isTeacher,
  updateTopicStatus
);
router.patch("/topic/:topicId/remark", verifyToken, isTeacher, addTopicRemark);

// Teacher-friendly: get batches with assigned syllabi (or single batch)
router.get(
  "/assigned-syllabi",
  verifyToken, // allow any authenticated user (teachers & admins)
  isTeacher,
  getAssignedSyllabiForTeacher
);

router.get("/batch-topics-teacher", verifyToken, isTeacher, getBatchTopics);

export default router;
