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
    parentEmail: { type: String, default: "" },
    parentPhoneNo: { type: String, default: "" },
    fatherName: { type: String, default: "" },
    fatherPhone: { type: String, default: "" },
    fatherEmail: { type: String, default: "" },
    motherName: { type: String, default: "" },
    motherPhone: { type: String, default: "" },
    motherEmail: { type: String, default: "" },
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
    customFields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
    resetPasswordOtp: { type: String, default: "" },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

studentSchema.index({ batch_name: 1, batch_no: 1 });
studentSchema.index({ course: 1, semester: 1 });
studentSchema.index({ role: 1 });

export const Student = mongoose.model("Student", studentSchema);
export default Student; 