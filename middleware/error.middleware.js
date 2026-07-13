import multer from "multer";

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle Multer-specific errors (file size, unexpected file type, etc.)
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum allowed size is 500 MB."
        : err.message || "File upload error";
    return res.status(status).json({ message });
  }

  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
};
