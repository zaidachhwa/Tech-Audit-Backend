import { Router } from "express";
import {
  getTeacherUpcomingLectures,
  punchInLecture,
  punchOutLecture,
  getPunchLogs,
  updateLectureTopic,
} from "../controllers/punch.controller.js";
import { verifyToken, isTeacher, isAdminOrTeacher } from "../middleware/auth.middleware.js";
import { uploadNotes } from "../middleware/upload.js";

const router = Router();

router.get("/upcoming", verifyToken, isTeacher, getTeacherUpcomingLectures);
router.post("/in", verifyToken, isTeacher, uploadNotes.single("file"), punchInLecture);
router.post("/out", verifyToken, isTeacher, uploadNotes.single("file"), punchOutLecture);
router.patch("/update-topic", verifyToken, isTeacher, updateLectureTopic);
router.get("/logs", verifyToken, isAdminOrTeacher, getPunchLogs);

export default router;
