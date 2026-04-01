import mongoose from "mongoose";
 
const announcementSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    batch: { type: String, default: "All Batches" }, // batch name or "All Batches"
    priority: {
      type: String,
      enum: ["info", "important", "urgent"],
      default: "info",
    },
  },
  { timestamps: true }
);
 
export const Announcement = mongoose.model("Announcement", announcementSchema);
 