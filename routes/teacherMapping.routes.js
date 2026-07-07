import express from "express";
import {
  createTeacherMapping,
  getTeacherMappings,
  updateTeacherMapping,
  deleteTeacherMapping
} from "../controllers/lecture.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, isAdmin, createTeacherMapping);
router.get("/", verifyToken, isAdmin, getTeacherMappings);
router.patch("/:id", verifyToken, isAdmin, updateTeacherMapping);
router.delete("/:id", verifyToken, isAdmin, deleteTeacherMapping);

export default router;
