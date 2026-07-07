import express from "express";
import {
  getHomeworkReport,
  getLectureReport,
  getTeacherReport,
  getStudentReport
} from "../controllers/reportV2.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/homework", verifyToken, isAdmin, getHomeworkReport);
router.get("/lecture", verifyToken, isAdmin, getLectureReport);
router.get("/teacher", verifyToken, isAdmin, getTeacherReport);
router.get("/student", verifyToken, isAdmin, getStudentReport);

export default router;
