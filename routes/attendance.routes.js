import express from "express";
import {
  markAttendance,
  getAttendance,
  getAttendanceSummary,
  getAttendanceForMonth,
  saveBulkAttendance,
} from "../controllers/attendance.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
 
const router = express.Router();
 
router.post("/mark", verifyToken, markAttendance);
router.post("/bulk", verifyToken, saveBulkAttendance);
router.get("/summary", verifyToken, getAttendanceSummary);
router.get("/:batchId", verifyToken, getAttendanceForMonth);
router.get("/", verifyToken, getAttendance);
 
export default router;
 