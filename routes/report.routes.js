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
} from "../controllers/report.controller.js";

import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= NORMAL REPORTS ================= */

router.post("/create", verifyToken, isAdmin, createReport);

router.get("/", verifyToken, isAdmin, getAllReports);

router.get("/batch/average", verifyToken, isAdmin, getBatchAverages);

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
router.post("/draft", verifyToken, isAdmin, saveDraftReport);

// ⭐ specific draft fetch (student + date)
router.get("/draft", verifyToken, isAdmin, getDraftReport);

// ⭐ all drafts list (admin panel)
router.get("/drafts", verifyToken, isAdmin, getAllDrafts);

// ⭐ delete draft
router.delete("/draft/:id", verifyToken, isAdmin, deleteDraft);

export default router;