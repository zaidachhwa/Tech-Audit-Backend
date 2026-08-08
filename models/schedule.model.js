import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  date: { type: Date, required: true },
  time_slot: { type: String, default: "" },
  status: { type: String, enum: ["Planned", "Scheduled", "Done"], default: "Planned" },
  homework: {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    due_date: { type: Date },
    accept_submissions: { type: Boolean, default: true }
  },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture", default: null },
  topicName: { type: String, default: "" },
  notes_shared: {
    type: mongoose.Schema.Types.Mixed,
    default: () => []
  },
  notes_teacher: {
    type: mongoose.Schema.Types.Mixed,
    default: () => []
  },
  isSaturdayLecture: { type: Boolean, default: false },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  venue: { type: String, default: "" },
  isTransferred: { type: Boolean, default: false },
  originalTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
  transferHistory: [{
    originalTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    newTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    transferredByRole: { type: String },
    transferredAt: { type: Date, default: Date.now },
    reason: { type: String, default: "" }
  }],
  venueHistory: [{
    oldVenue: { type: String, default: "" },
    newVenue: { type: String, default: "" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByRole: { type: String },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, default: "" }
  }],
  punchInTime: { type: Date, default: null },
  punchOutTime: { type: Date, default: null },
  punchInNotes: { type: String, default: "" },
  punchOutNotes: { type: String, default: "" },
  punchInFile: {
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" }
  },
  punchOutFile: {
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" }
  },
  punchStatus: {
    type: String,
    enum: ["PENDING", "PUNCHED_IN", "PUNCHED_OUT"],
    default: "PENDING"
  }
});

const scheduleSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    lectures: [lectureSchema],
    verificationStatus: {
      type: String,
      enum: ["pending_teacher", "approved"],
      default: "approved"
    },
    createdByRole: {
      type: String,
      enum: ["admin", "teacher"],
      default: "admin"
    }
  },
  { timestamps: true }
);

export const Schedule = mongoose.model("Schedule", scheduleSchema);
export default Schedule;
