import mongoose from "mongoose";

const syllabusSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    description: { type: String, default: "" },

    topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],

    assignedTeachers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

export const Syllabus = mongoose.model("Syllabus", syllabusSchema);
