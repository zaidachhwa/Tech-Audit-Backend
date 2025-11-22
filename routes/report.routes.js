import express from "express";
import {
  createReport,
  getAllReports,
  getReportsByStudent,
  getBatchAverages,
} from "../controllers/report.controller.js";
import {
  verifyToken,
  isAdmin,
  isStudent,
} from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/create", verifyToken, isAdmin, createReport);
router.get("/", verifyToken, isAdmin, getAllReports);
router.get("/batch/average", verifyToken, isAdmin, getBatchAverages);
router.get(
  "/student/:studentId",
  verifyToken,
  (req, res, next) => {
    // allow student to view their own reports
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res
        .status(403)
        .json({ message: "You can only view your own reports." });
    }
    next();
  },
  getReportsByStudent
);

export default router;
