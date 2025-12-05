import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: Number, required: true },

    subjects: [{ type: String }],

    role: { type: String, default: "teacher" },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
