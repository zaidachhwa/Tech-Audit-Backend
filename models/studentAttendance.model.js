import mongoose from "mongoose";

const lectureAttendanceSchema = new mongoose.Schema({
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", default: null },
  lectureId: { type: String, default: "" },
  batchLectureId: { type: mongoose.Schema.Types.ObjectId, ref: "BatchLecture", default: null },
  lectureTitle: { type: String, default: "" },
  subject: { type: String, default: "" },
  timeSlot: { type: String, default: "" },
  status: { type: String, enum: ["Present", "Absent"], default: "Absent" },
}, { _id: false });

const editHistorySchema = new mongoose.Schema({
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  editedAt: { type: Date, default: Date.now },
  oldPunchIn: { type: Date, default: null },
  oldPunchOut: { type: Date, default: null },
  newPunchIn: { type: Date, default: null },
  newPunchOut: { type: Date, default: null },
  reason: { type: String, default: "" },
}, { _id: false });

const studentAttendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    date: { type: Date, required: true }, // normalized to midnight
    punchInTime: { type: Date, default: null },
    punchOutTime: { type: Date, default: null },
    punchInPhoto: { type: String, default: null },
    punchOutPhoto: { type: String, default: null },
    punchInLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    punchOutLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ["NOT_PUNCHED", "PUNCHED_IN", "PUNCHED_OUT"],
      default: "NOT_PUNCHED",
    },
    lectureAttendance: [lectureAttendanceSchema],
    editHistory: [editHistorySchema],
  },
  { timestamps: true }
);

// One record per student per day
studentAttendanceSchema.index({ student: 1, date: 1 }, { unique: true });
studentAttendanceSchema.index({ batch: 1, date: 1 });

export const StudentAttendance = mongoose.model("StudentAttendance", studentAttendanceSchema);
export default StudentAttendance;
