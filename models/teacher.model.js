import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // Optional: subjects they handle
    subjects: [{ type: String }],
  },
  { timestamps: true }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
