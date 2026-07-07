import express from "express";
import {
  createMapping,
  getMappings,
  updateMapping,
  deleteMapping
} from "../controllers/studentBatch.controller.js";
import { verifyToken, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", verifyToken, isAdminOrTeacher, createMapping);
router.get("/", verifyToken, isAdminOrTeacher, getMappings);
router.patch("/:id", verifyToken, isAdminOrTeacher, updateMapping);
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteMapping);

export default router;
