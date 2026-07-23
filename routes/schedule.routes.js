import { Router } from "express";
import {
  createSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  saveHomework,
  getLectureSubmissions,
  submitHomework,
  reviewSubmission,
  getScheduleSubmissions,
  deleteSubmission,
  saveNotes,
  uploadNotesGeneric,
  deleteNotes,
  verifySchedule,
  updateBatchLectureFromScheduler,
  checkConflicts
} from "../controllers/schedule.controller.js";
import { verifyToken, isAdmin, isAdminOrTeacher, isTeacher } from "../middleware/auth.middleware.js";
import { uploadNotes } from "../middleware/upload.js";

const router = Router();

router.post("/create", verifyToken, isAdminOrTeacher, createSchedule);
router.get("/list", verifyToken, listSchedules);
router.put("/batch-lecture/:id", verifyToken, updateBatchLectureFromScheduler);
router.post("/check-conflicts", verifyToken, isAdminOrTeacher, checkConflicts);

// Homework and Submissions API
router.post("/:scheduleId/lectures/:lectureId/homework", verifyToken, saveHomework);
router.post(
  "/:scheduleId/lectures/:lectureId/notes", 
  verifyToken, 
  isAdminOrTeacher, 
  uploadNotes.fields([
    { name: "notes_shared", maxCount: 1 },
    { name: "notes_teacher", maxCount: 1 }
  ]), 
  saveNotes
);
router.delete("/:scheduleId/lectures/:lectureId/notes/:type", verifyToken, isAdminOrTeacher, deleteNotes);

// Generic upload for unsaved schedules/templates
router.post(
  "/upload", 
  verifyToken, 
  isAdminOrTeacher, 
  uploadNotes.fields([
    { name: "notes_shared", maxCount: 1 },
    { name: "notes_teacher", maxCount: 1 }
  ]), 
  uploadNotesGeneric
);

router.get("/:scheduleId/lectures/:lectureId/submissions", verifyToken, getLectureSubmissions);
router.post("/:scheduleId/lectures/:lectureId/submissions", verifyToken, submitHomework);
router.patch("/submissions/:submissionId/review", verifyToken, reviewSubmission);
router.delete("/submissions/:submissionId", verifyToken, deleteSubmission);
router.get("/:id/submissions", verifyToken, isAdminOrTeacher, getScheduleSubmissions);

router.get("/:id", verifyToken, getScheduleById);
router.put("/update/:id", verifyToken, updateSchedule);
router.delete("/delete/:id", verifyToken, isAdminOrTeacher, deleteSchedule);
router.patch("/:id/verify", verifyToken, isAdminOrTeacher, verifySchedule);

export default router;
