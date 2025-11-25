import { Router } from "express";
import {
  approveStudent,
  loginAdmin,
  RegisterAdmin,
  rejectStudent,
} from "../controllers/admin.controller.js";

import { isAdmin, verifyToken } from "../middleware/auth.middleware.js";
import {
  approveTeacher,
  rejectTeacher,
} from "../controllers/teacher.controller.js";

const router = Router();
router.post("/register", RegisterAdmin);
router.post("/login", loginAdmin);

//  Approve Student
router.patch(
  "/approve-student/:studentId",
  verifyToken,
  isAdmin,
  approveStudent
);
//  Reject / Deactivate Student
router.patch("/reject-student/:studentId", verifyToken, isAdmin, rejectStudent);

router.patch(
  "/approve-teacher/:teacherId",
  verifyToken,
  isAdmin,
  approveTeacher
);
router.patch("/reject-teacher/:teacherId", verifyToken, isAdmin, rejectTeacher);

export default router;
