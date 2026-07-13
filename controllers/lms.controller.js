import path from "path";
import fs from "fs";
import * as lmsService from "../services/lms.service.js";

// ─── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  // Videos
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

// Derive a human-readable fileType category from mimeType
const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word";
  if (
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "pptx";
  if (mimeType === "text/plain") return "text";
  return "other";
};

// ─── Upload / Create LMS Resource ─────────────────────────────────────────────
export const uploadLmsResource = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { mimetype, filename, originalname, size } = req.file;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(mimetype)) {
      // Remove the rejected file from disk
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        message:
          "File type not allowed. Accepted: videos, images, PDF, Word, PowerPoint, TXT.",
      });
    }

    const { title, description, visibility, batches } = req.body;

    if (!title) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Title is required" });
    }

    const visibilityValue = visibility || "all";
    if (!["all", "specific"].includes(visibilityValue)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "visibility must be 'all' or 'specific'" });
    }

    // Parse batches — can arrive as JSON string or array
    let batchIds = [];
    if (visibilityValue === "specific") {
      if (typeof batches === "string") {
        try {
          batchIds = JSON.parse(batches);
        } catch {
          batchIds = [batches];
        }
      } else if (Array.isArray(batches)) {
        batchIds = batches;
      }

      if (!batchIds.length) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          message: "At least one batch must be selected when visibility is 'specific'",
        });
      }
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    const fileType = getFileTypeCategory(mimetype);

    const lms = await lmsService.createLmsService({
      title,
      description: description || "",
      fileUrl,
      fileName: filename,
      originalName: originalname,
      fileType,
      mimeType: mimetype,
      fileSize: size,
      visibility: visibilityValue,
      batches: batchIds,
      uploadedBy: req.user.id,
      uploadedByRole: req.user.role,
    });

    return res.status(201).json({ message: "LMS resource uploaded successfully", lms });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(500).json({ message: err.message });
  }
};

// ─── Get All LMS Resources (Admin / Teacher) ──────────────────────────────────
export const getAllLmsResources = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await lmsService.getAllLmsService({
      page: Number(page),
      limit: Number(limit),
    });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Get LMS Resources for Logged-in Student ──────────────────────────────────
export const getStudentLmsResources = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await lmsService.getLmsForStudentService({
      studentId: req.user.id,
      page: Number(page),
      limit: Number(limit),
    });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Get Single LMS Resource by ID ────────────────────────────────────────────
export const getLmsResourceById = async (req, res) => {
  try {
    const lms = await lmsService.getLmsById(req.params.id);
    if (!lms) return res.status(404).json({ message: "LMS resource not found" });

    // Students: only return if they have access
    if (req.user.role === "student") {
      if (lms.visibility === "specific") {
        const { StudentBatchMapping } = await import("../models/studentBatchMapping.model.js");
        const mappings = await StudentBatchMapping.find({ student: req.user.id }).lean();
        const studentBatchIds = mappings.map((m) => m.batch.toString());
        const batchIds = lms.batches.map((b) => b._id.toString());
        const hasAccess = batchIds.some((id) => studentBatchIds.includes(id));
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
    }

    return res.status(200).json(lms);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Update LMS Resource Metadata ─────────────────────────────────────────────
export const updateLmsResource = async (req, res) => {
  try {
    const { title, description, visibility, batches } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (visibility !== undefined) {
      if (!["all", "specific"].includes(visibility)) {
        return res.status(400).json({ message: "visibility must be 'all' or 'specific'" });
      }
      updateData.visibility = visibility;
    }
    if (batches !== undefined) {
      updateData.batches = typeof batches === "string" ? JSON.parse(batches) : batches;
    }

    const updated = await lmsService.updateLmsService(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: "LMS resource not found" });

    return res.status(200).json({ message: "LMS resource updated", lms: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Delete LMS Resource ──────────────────────────────────────────────────────
export const deleteLmsResource = async (req, res) => {
  try {
    const lms = await lmsService.getLmsById(req.params.id);
    if (!lms) return res.status(404).json({ message: "LMS resource not found" });

    // Remove the file from disk
    const filePath = path.join("uploads", lms.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }

    await lmsService.deleteLmsService(req.params.id);
    return res.status(200).json({ message: "LMS resource deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
