import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Allowed MIME types for LMS uploads ───────────────────────────────────────
const LMS_ALLOWED_MIMES = new Set([
  // Videos
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",    // .avi
  "video/x-matroska",   // .mkv
  "video/webm",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",                                                          // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",    // .docx
  "application/vnd.ms-powerpoint",                                              // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",  // .pptx
  "text/plain",                                                                  // .txt
]);

// ─── Disk storage config ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "lms-" + uniqueSuffix + ext);
  },
});

// ─── File filter — reject disallowed types early ──────────────────────────────
const fileFilter = (req, file, cb) => {
  if (LMS_ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        "LIMIT_UNEXPECTED_FILE",
        `File type '${file.mimetype}' is not allowed. Accepted: videos, images, PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), TXT.`
      ),
      false
    );
  }
};

// ─── LMS multer instance: 500 MB limit (for video recordings) ─────────────────
export const uploadLms = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});
