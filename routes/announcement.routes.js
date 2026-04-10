import express from "express";
import {
  createAnnouncement,
  getAnnouncement,
  deleteAnnouncement,
  getStudentAnnouncements,
} from "../controllers/announcement.controller.js";
import { verifyToken, isStudent } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, createAnnouncement);
router.get("/", verifyToken, getAnnouncement);
router.get("/student", verifyToken, isStudent, getStudentAnnouncements);
router.delete("/:id", verifyToken, deleteAnnouncement);

export default router;