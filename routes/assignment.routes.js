import express from "express";
import { createAssignment, getAssignmentsByBatch, getMyAssignments, updateAssignmentStatus } from "../controllers/assignment.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", verifyToken, createAssignment);
router.get("/batch/:batchId", verifyToken, getAssignmentsByBatch);
router.get("/my", verifyToken, getMyAssignments);  // student: get own assignments
router.patch("/:assignmentId/status", verifyToken, updateAssignmentStatus);

export default router;