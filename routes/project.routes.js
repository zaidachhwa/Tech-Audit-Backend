import express from "express";
import {
  assignProjectToBatch,
  createProject,
  getProjectsByBatch,
  getProjectsByStudent,
  getProjectById,
  updateProject,
  deleteProject,
  updateModuleStatus,
  updateProjectStatus,
  submitProject,
  approveProject,
} from "../controllers/project.controller.js";
import {
  verifyToken,
  isAdmin,
  isStudent,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== ADMIN ROUTES =====
router.post("/assign-to-batch", verifyToken, isAdmin, assignProjectToBatch);
router.post("/create", verifyToken, isAdmin, createProject);
router.get("/batch/:batchId", verifyToken, isAdmin, getProjectsByBatch);
router.get("/student/:studentId", verifyToken, getProjectsByStudent); // Allow both admin and student
router.get("/:projectId", verifyToken, getProjectById);
router.patch("/:projectId", verifyToken, isAdmin, updateProject);
router.delete("/:projectId", verifyToken, isAdmin, deleteProject);
router.patch("/:projectId/approve", verifyToken, isAdmin, approveProject);

// ===== STUDENT ROUTES =====
router.patch("/module/:moduleId", verifyToken, isStudent, updateModuleStatus);
router.patch("/:projectId/status", verifyToken, isStudent, updateProjectStatus);
router.patch("/:projectId/submit", verifyToken, isStudent, submitProject);

export default router;
