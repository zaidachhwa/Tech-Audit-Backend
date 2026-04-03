import mongoose from "mongoose";
 
const attendanceRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  status: { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
});
 
const attendanceSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    date: { type: Date, required: true },
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);
 
// One attendance doc per batch per date per teacher
attendanceSchema.index({ batch: 1, date: 1, teacher: 1 }, { unique: true });
 
export const Attendance = mongoose.model("Attendance", attendanceSchema);
 