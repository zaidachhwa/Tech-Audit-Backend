import express from "express";
import {
  createChapter,
  getChapters,
  updateChapter,
  deleteChapter
} from "../controllers/chapter.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getChapters);
router.post("/", verifyToken, isAdminOrTeacher, createChapter);
router.patch("/:id", verifyToken, isAdminOrTeacher, updateChapter);
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteChapter);

export default router;
