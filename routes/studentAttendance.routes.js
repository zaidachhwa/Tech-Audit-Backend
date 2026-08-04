import { Router } from "express";
import {
  studentPunchIn,
  studentPunchOut,
  getTodayStatus,
  getMyAttendance,
  getStudentAttendanceLogs,
  adminEditPunchTime,
  adminApproveLateAttendance,
  adminRejectLateAttendance,
} from "../controllers/studentAttendance.controller.js";
import { verifyToken, isStudent, isAdminOrTeacher, isAdmin } from "../middleware/auth.middleware.js";
import { uploadNotes } from "../middleware/upload.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Image proxy to bypass Nginx static file blocking
router.get("/photo", (req, res) => {
  try {
    const { file } = req.query;
    if (!file) return res.status(400).send("No file provided");
    
    const safePath = path.basename(file);
    const fullPath = path.resolve(__dirname, "..", "uploads", safePath);
    
    if (fs.existsSync(fullPath)) {
      res.sendFile(fullPath);
    } else {
      res.status(404).send("Not found");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Student routes
router.post("/punch-in", verifyToken, isStudent, uploadNotes.single("photo"), studentPunchIn);
router.post("/punch-out", verifyToken, isStudent, uploadNotes.single("photo"), studentPunchOut);
router.get("/today", verifyToken, isStudent, getTodayStatus);
router.get("/my", verifyToken, isStudent, getMyAttendance);

// Teacher/Admin routes
router.get("/records", verifyToken, isAdminOrTeacher, getStudentAttendanceLogs);

// Admin/Teacher routes
router.patch("/:id/edit", verifyToken, isAdminOrTeacher, adminEditPunchTime);
router.put("/approve-late/:id", verifyToken, isAdminOrTeacher, adminApproveLateAttendance);
router.put("/reject-late/:id", verifyToken, isAdminOrTeacher, adminRejectLateAttendance);

export default router;
