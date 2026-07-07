import mongoose from "mongoose";

const syllabusSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    description: { type: String, default: "" },

    lectures: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],
    topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lecture" }],

    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

export const Syllabus = mongoose.model("Syllabus", syllabusSchema);
