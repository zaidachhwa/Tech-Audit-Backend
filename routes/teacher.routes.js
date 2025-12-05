import express from "express";
import {
  registerTeacher,
  loginTeacher,
  approveTeacher,
  rejectTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacher.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerTeacher);
router.post("/login", loginTeacher);

router.get("/list", verifyToken, isAdmin, getAllTeachers);
router.patch("/approve/:teacherId", verifyToken, isAdmin, approveTeacher);
router.patch("/reject/:teacherId", verifyToken, isAdmin, rejectTeacher);

router.patch("/update/:teacherId", verifyToken, isAdmin, updateTeacher);
router.delete("/delete/:teacherId", verifyToken, isAdmin, deleteTeacher);

export default router;
