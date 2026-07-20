import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  addStudentToBatch,
  assignTeachersToBatch,
  getPublicBatches,
  updateBatch,
  deleteBatch,
  getUniqueBatchNames,
  getBatchNumbersByName,
} from "../controllers/batch.controller.js";

import { verifyToken, isAdmin, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= PUBLIC =================
router.get("/public", getPublicBatches);

// ================= ADMIN/TEACHER =================
router.post("/create", verifyToken, isAdminOrTeacher, createBatch);
router.get("/", verifyToken, isAdminOrTeacher, getAllBatches);

// ================= DROPDOWN HELPERS =================
// 🔥 MUST BE ABOVE "/:id" routes to avoid conflicts
router.get("/names", verifyToken, getUniqueBatchNames);
router.get("/numbers", verifyToken, getBatchNumbersByName);

router.get("/:id/students", verifyToken, getBatchById);  // teachers can access this
router.get("/:id", verifyToken, isAdminOrTeacher, getBatchById);
router.put("/:id/add-student", verifyToken, isAdminOrTeacher, addStudentToBatch);
router.put("/:id/assign-teachers", verifyToken, isAdminOrTeacher, assignTeachersToBatch);
router.put("/:id", verifyToken, isAdminOrTeacher, updateBatch);
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteBatch);

export default router;