import mongoose from "mongoose";

const lecturePunchLogSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      default: null,
    },
    batchLectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchLecture",
      default: null,
    },
    lectureId: {
      type: String,
      required: true,
    },
    lectureTitle: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    scheduledDate: {
      type: Date,
    },
    scheduledTimeSlot: {
      type: String,
      default: "",
    },

    // Punch In Details
    punchInTime: {
      type: Date,
      default: null,
    },
    punchInNotes: {
      type: String,
      default: "",
    },
    punchInFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
    },

    // Punch Out Details
    punchOutTime: {
      type: Date,
      default: null,
    },
    punchOutNotes: {
      type: String,
      default: "",
    },
    punchOutFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: ["PUNCHED_IN", "PUNCHED_OUT"],
      default: "PUNCHED_IN",
    },
  },
  { timestamps: true }
);

lecturePunchLogSchema.index({ teacher: 1, createdAt: -1 });
lecturePunchLogSchema.index({ batch: 1 });

export const LecturePunchLog = mongoose.model("LecturePunchLog", lecturePunchLogSchema);
export default LecturePunchLog;
