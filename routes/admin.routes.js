import { Router } from "express";
import {
  approveStudent,
  loginAdmin,
  RegisterAdmin,
  rejectStudent,
} from "../controllers/admin.controller.js";
import { isAdmin, verifyToken } from "../middleware/auth.middleware.js";

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
export default router;
