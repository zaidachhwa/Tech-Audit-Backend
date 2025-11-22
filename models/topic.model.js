import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    syllabus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syllabus",
      required: true,
    },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, required: true },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },

    completionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    completedAt: { type: Date },
    remarks: { type: String, default: "" },

    // Optional: student progress
    studentsProgress: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },
        remarks: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export const Topic = mongoose.model("Topic", topicSchema);
