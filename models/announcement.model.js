import mongoose from "mongoose";
 
const announcementSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: false },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: false },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetAudience: { type: String, enum: ["Students", "Teachers", "Both"], default: "Students" },
    targetTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: false },
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
 