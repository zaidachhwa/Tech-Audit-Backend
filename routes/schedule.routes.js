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
  reviewSubmission
} from "../controllers/schedule.controller.js";
import { verifyToken, isAdmin, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/create", verifyToken, isAdminOrTeacher, createSchedule);
router.get("/list", verifyToken, listSchedules);

// Homework and Submissions API
router.post("/:scheduleId/lectures/:lectureId/homework", verifyToken, saveHomework);
router.get("/:scheduleId/lectures/:lectureId/submissions", verifyToken, getLectureSubmissions);
router.post("/:scheduleId/lectures/:lectureId/submissions", verifyToken, submitHomework);
router.patch("/submissions/:submissionId/review", verifyToken, reviewSubmission);

router.get("/:id", verifyToken, getScheduleById);
router.put("/update/:id", verifyToken, updateSchedule);
router.delete("/delete/:id", verifyToken, isAdmin, deleteSchedule);

export default router;
