import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch_name: { type: String, required: true },
    batch_no: { type: Number, required: true },
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    role: { type: String, default: "student" },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Student = mongoose.model("Student", studentSchema);
