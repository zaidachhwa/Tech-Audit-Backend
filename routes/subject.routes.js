import express from "express";
import {
  createSyllabus,
  getAllSyllabi,
  updateSyllabus,
  deleteSyllabus
} from "../controllers/syllabus.controller.js";
import {
  getSubjectTemplates,
  saveSubjectTemplate,
  deleteSubjectTemplate,
  updateSubjectTemplateStatus,
  verifySubjectTemplate
} from "../controllers/subjectTemplate.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";
import { Syllabus } from "../models/syllabus.model.js";
import { SubjectTemplate } from "../models/subjectTemplate.model.js";

const router = express.Router();

// GET all subjects (Syllabus tracker or scheduler based on type/header)
router.get("/", verifyToken, async (req, res, next) => {
  if (req.query.type === "scheduling" || req.query.scheduling === "true") {
    return getSubjectTemplates(req, res, next);
  }
  // Default to Syllabus Tracker subject templates
  return getAllSyllabi(req, res, next);
});

// GET single subject details
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  let subject = await Syllabus.findById(id).populate("lectures");
  if (!subject) {
    subject = await SubjectTemplate.findById(id);
  }
  if (!subject) {
    return res.status(404).json({ message: "Subject not found" });
  }
  res.json(subject);
});

// POST create subject (detects structure of body to route to Syllabus or SubjectTemplate)
router.post("/", verifyToken, async (req, res, next) => {
  if (req.body.name && Array.isArray(req.body.lectures)) {
    // Looks like SubjectTemplate for scheduling
    return saveSubjectTemplate(req, res, next);
  }
  // Default to Syllabus Tracker subject template
  return createSyllabus(req, res, next);
});

// PUT / PATCH update subject
router.put("/:id", verifyToken, updateSyllabus);
router.patch("/:id", verifyToken, updateSyllabus);

// DELETE subject (checks database to delete from Syllabus or SubjectTemplate)
router.delete("/:id", verifyToken, async (req, res, next) => {
  const { id } = req.params;
  const isSyllabus = await Syllabus.findById(id);
  if (isSyllabus) {
    return deleteSyllabus(req, res, next);
  }
  // Otherwise try SubjectTemplate
  return deleteSubjectTemplate(req, res, next);
});

// PATCH endpoints (backward-compatibility for calendar scheduling only)
router.patch("/:id/status", verifyToken, updateSubjectTemplateStatus);
router.patch("/:id/verify", verifyToken, verifySubjectTemplate);

export default router;
