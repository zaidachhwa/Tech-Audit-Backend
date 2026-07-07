import express from "express";
import {
  createReference,
  getReferences,
  updateReference,
  deleteReference
} from "../controllers/reference.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getReferences);
router.post("/", verifyToken, isAdminOrTeacher, createReference);
router.patch("/:id", verifyToken, isAdminOrTeacher, updateReference);
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteReference);

export default router;
