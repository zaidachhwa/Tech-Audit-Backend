import express from "express";
import {
  verifyToken,
  isAdmin,
  isTeacher,
} from "../middleware/auth.middleware.js";
import {
  createSyllabus,
  addTopic,
  assignTopicToTeacher,
  getTeacherTopics,
  markTopicCompleted,
  addTopicRemark,
  getSyllabusWithProgress,
  getAllSyllabi,
} from "../controllers/syllabus.controller.js";

const router = express.Router();

// ADMIN
router.post("/create", verifyToken, isAdmin, createSyllabus);
router.post("/topic", verifyToken, isAdmin, addTopic);
router.patch("/assign-topic", verifyToken, isAdmin, assignTopicToTeacher);
router.get(
  "/progress/:syllabusId",
  verifyToken,
  isAdmin,
  getSyllabusWithProgress
);

// TEACHER
router.get("/my-topics", verifyToken, isTeacher, getTeacherTopics);
router.patch(
  "/topic/:topicId/complete",
  verifyToken,
  isTeacher,
  markTopicCompleted
);
router.patch("/topic/:topicId/remark", verifyToken, isTeacher, addTopicRemark);
router.get("/all", verifyToken, isAdmin, getAllSyllabi);

export default router;
