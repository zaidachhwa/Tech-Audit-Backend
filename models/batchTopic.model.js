import mongoose from "mongoose";

const batchTopicSchema = new mongoose.Schema(
  {
    // reference to which batch & which syllabus template this instance belongs to
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    syllabus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syllabus",
      required: true,
    },

    // keep link to template topic so we can trace to master template
    templateTopic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },

    // copied fields (allow per-batch overrides)
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date },

    // assignment and status are batch-scoped
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    completionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    completedAt: { type: Date },
    remarks: { type: String, default: "" },

    // Optional student-level progress specific to this batch
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

// index for common queries
batchTopicSchema.index({ batch: 1, assignedTo: 1 });
batchTopicSchema.index({ syllabus: 1, batch: 1 });

export const BatchTopic = mongoose.model("BatchTopic", batchTopicSchema);
