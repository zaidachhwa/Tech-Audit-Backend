import express from "express";
import { createAssignment, getAssignmentsByBatch } from "../controllers/assignment.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create", verifyToken, createAssignment);
router.get("/batch/:batchId", verifyToken, getAssignmentsByBatch);

export default router;