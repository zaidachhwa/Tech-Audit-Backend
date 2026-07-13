import express from "express";
import {
  uploadLmsResource,
  getAllLmsResources,
  getStudentLmsResources,
  getLmsResourceById,
  updateLmsResource,
  deleteLmsResource,
} from "../controllers/lms.controller.js";
import {
  verifyToken,
  isAdminOrTeacher,
  isStudent,
} from "../middleware/auth.middleware.js";
import { uploadLms } from "../middleware/lmsUpload.js";

const router = express.Router();

// ─── Admin / Teacher: upload a new LMS resource ───────────────────────────────
// multipart/form-data fields:
//   file        — the actual file (required)
//   title       — string (required)
//   description — string (optional)
//   visibility  — "all" | "specific" (default: "all")
//   batches     — JSON array of Batch ObjectIds (required when visibility="specific")
router.post(
  "/upload",
  verifyToken,
  isAdminOrTeacher,
  uploadLms.single("file"),
  uploadLmsResource
);

// ─── Admin / Teacher: list all LMS resources (paginated) ─────────────────────
router.get("/", verifyToken, isAdminOrTeacher, getAllLmsResources);

// ─── Student: list LMS resources they have access to (paginated) ─────────────
router.get("/my", verifyToken, isStudent, getStudentLmsResources);

// ─── Any authenticated user: get a single LMS resource ───────────────────────
// Students will get 403 if they don't have batch access
router.get("/:id", verifyToken, getLmsResourceById);

// ─── Admin / Teacher: update LMS metadata (title, description, visibility) ────
router.put("/:id", verifyToken, isAdminOrTeacher, updateLmsResource);

// ─── Admin / Teacher: delete LMS resource (also removes file from disk) ───────
router.delete("/:id", verifyToken, isAdminOrTeacher, deleteLmsResource);

export default router;
