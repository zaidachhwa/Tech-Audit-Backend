import express from "express";
import {
  createReport,
  getAllReports,
  getReportsByStudent,
  getBatchAverages,
  generateReportPdf,
  generateReportPreviewPdf,
  saveDraftReport,
  getDraftReport,
  getAllDrafts,
  deleteDraft,
  deleteReport,
  lookupReportByStudentAndDate,
} from "../controllers/report.controller.js";

import { verifyToken, isAdmin, isAdminOrTeacher } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= NORMAL REPORTS ================= */

router.post("/create", verifyToken, isAdminOrTeacher, createReport);

router.get("/", verifyToken, isAdminOrTeacher, getAllReports);

router.get("/batch/average", verifyToken, isAdminOrTeacher, getBatchAverages);

router.get(
  "/student/:studentId",
  verifyToken,
  (req, res, next) => {
    // ⭐ student apne hi reports dekh sake
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res
        .status(403)
        .json({ message: "You can only view your own reports." });
    }
    next();
  },
  getReportsByStudent
);

router.get("/:id/pdf", generateReportPdf);

router.post("/preview", generateReportPreviewPdf);

/* ================= DRAFT ROUTES ================= */

// ⭐ draft save / update
router.post("/draft", verifyToken, isAdminOrTeacher, saveDraftReport);

// ⭐ specific draft fetch (student + date)
router.get("/draft", verifyToken, isAdminOrTeacher, getDraftReport);

// ⭐ all drafts list (admin panel)
router.get("/drafts", verifyToken, isAdminOrTeacher, getAllDrafts);

// ⭐ delete draft
router.delete("/draft/:id", verifyToken, isAdminOrTeacher, deleteDraft);

// 🔥 lookup route
router.get("/lookup", verifyToken, isAdminOrTeacher, lookupReportByStudentAndDate);

router.delete("/:id", verifyToken, isAdminOrTeacher, deleteReport);

export default router;