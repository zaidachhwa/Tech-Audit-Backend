import express from "express";
import {
  markAttendance,
  getAttendance,
  getAttendanceSummary,
} from "../controllers/attendance.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
 
const router = express.Router();
 
router.post("/mark", verifyToken, markAttendance);
router.get("/", verifyToken, getAttendance);
router.get("/summary", verifyToken, getAttendanceSummary);
 
export default router;
 