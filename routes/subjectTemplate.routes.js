import express from "express";
import {
  getSubjectTemplates,
  saveSubjectTemplate,
  deleteSubjectTemplate
} from "../controllers/subjectTemplate.controller.js";
import { verifyToken, isAdmin, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, isAdminOrTeacher, getSubjectTemplates);
router.post("/", verifyToken, isAdmin, saveSubjectTemplate);
router.delete("/:id", verifyToken, isAdmin, deleteSubjectTemplate);

export default router;
