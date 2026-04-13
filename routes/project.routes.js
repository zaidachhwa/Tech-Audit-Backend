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
  isAdminOrTeacher,
  isStudent,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// ===== ADMIN ROUTES =====
router.post("/assign-to-batch", verifyToken, isAdminOrTeacher, assignProjectToBatch);
router.post("/create", verifyToken, isAdminOrTeacher, createProject);
router.get("/batch/:batchId", verifyToken, isAdminOrTeacher, getProjectsByBatch);
router.get("/student/:studentId", verifyToken, getProjectsByStudent); // Allow both admin and student
router.get("/:projectId", verifyToken, getProjectById);
router.patch("/:projectId", verifyToken, isAdminOrTeacher, updateProject);
router.delete("/:projectId", verifyToken, isAdminOrTeacher, deleteProject);
router.patch("/:projectId/approve", verifyToken, isAdminOrTeacher, approveProject);

// ===== STUDENT ROUTES =====
router.patch("/module/:moduleId", verifyToken, isStudent, updateModuleStatus);
router.patch("/:projectId/status", verifyToken, isStudent, updateProjectStatus);
router.patch("/:projectId/submit", verifyToken, isStudent, submitProject);

export default router;
