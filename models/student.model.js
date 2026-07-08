import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    profilePhoto: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch_name: { type: String, required: true },
    batch_no: { type: String, required: true },
    reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "Report" }],
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
    role: { type: String, default: "student" },
    phoneNo: { type: String, default: "" },
    enrollmentNo: { type: String, default: "" },
    rollNo: { type: String, default: "" },
    course: { type: String, default: "" },
    semester: { type: String, default: "" },
    department: { type: String, default: "" },
    dob: { type: String, default: "" },
    gender: { type: String, default: "" },
    idCardPhoto: { type: String, default: "" },
    aadhaarPhoto: { type: String, default: "" },
    isActive: { type: Boolean, default: false },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);


export const Student = mongoose.model("Student", studentSchema);
export default Student; 