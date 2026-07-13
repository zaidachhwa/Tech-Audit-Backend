import mongoose from "mongoose";

const lmsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // File details
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true }, // e.g. "video", "image", "pdf", etc.
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true }, // bytes

    // Visibility: "all" | "specific"
    visibility: {
      type: String,
      enum: ["all", "specific"],
      default: "all",
    },

    // If visibility === "specific", which batches can see it
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],

    // Who uploaded
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    uploadedByRole: {
      type: String,
      enum: ["admin", "teacher"],
      required: true,
    },
  },
  { timestamps: true }
);

export const LMS = mongoose.model("LMS", lmsSchema);
export default LMS;
