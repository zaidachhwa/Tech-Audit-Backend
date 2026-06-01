import express from "express";
import {
  getSubjectTemplates,
  saveSubjectTemplate,
  deleteSubjectTemplate,
  updateSubjectTemplateStatus,
  verifySubjectTemplate
} from "../controllers/subjectTemplate.controller.js";
import { verifyToken, isAdmin, isAdminOrTeacher, isTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, isAdminOrTeacher, getSubjectTemplates);
router.post("/", verifyToken, isAdminOrTeacher, saveSubjectTemplate);
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteSubjectTemplate);
router.patch("/:id/status", verifyToken, isAdmin, updateSubjectTemplateStatus);
router.patch("/:id/verify", verifyToken, isTeacher, verifySubjectTemplate);

export default router;
