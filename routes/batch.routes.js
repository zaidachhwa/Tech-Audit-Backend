import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  addStudentToBatch,
  getPublicBatches,
  updateBatch,
  deleteBatch,
} from "../controllers/batch.controller.js";
import { isAdmin, verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ PUBLIC route
router.get("/public", getPublicBatches);

// ✅ ADMIN routes
router.post("/create", verifyToken, isAdmin, createBatch);
router.get("/", verifyToken, isAdmin, getAllBatches);
router.get("/:id", verifyToken, isAdmin, getBatchById);
router.put("/:id/add-student", verifyToken, isAdmin, addStudentToBatch);

// ✅ NEW ROUTES
router.put("/:id", verifyToken, isAdmin, updateBatch);   // UPDATE
router.delete("/:id", verifyToken, isAdmin, deleteBatch); // DELETE

export default router;
