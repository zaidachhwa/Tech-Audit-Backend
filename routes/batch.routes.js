import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  addStudentToBatch,
  getPublicBatches,
  updateBatch,
  deleteBatch,
  getUniqueBatchNames,
  getBatchNumbersByName,
} from "../controllers/batch.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// ================= PUBLIC =================
router.get("/public", getPublicBatches);

// ================= ADMIN =================
router.post("/create", verifyToken, isAdmin, createBatch);
router.get("/", verifyToken, isAdmin, getAllBatches);
router.get("/:id", verifyToken, isAdmin, getBatchById);
router.put("/:id/add-student", verifyToken, isAdmin, addStudentToBatch);
router.put("/:id", verifyToken, isAdmin, updateBatch);
router.delete("/:id", verifyToken, isAdmin, deleteBatch);

// ================= DROPDOWN HELPERS =================
// 🔥 MUST BE ABOVE "/:id" routes to avoid conflicts
router.get("/names", verifyToken, getUniqueBatchNames);
router.get("/numbers", verifyToken, getBatchNumbersByName);

export default router;