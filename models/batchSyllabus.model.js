import mongoose from "mongoose";

const batchSyllabusSchema = new mongoose.Schema(
  {
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

    // who assigned this (admin)
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    // optional friendly name / notes
    notes: {
      type: String,
      default: "",
    },

    // optional syllabus-level due date
    dueDate: {
      type: Date,
      required: false,
    },
  },
  { timestamps: true }
);

// prevent duplicate assignment
batchSyllabusSchema.index({ batch: 1, syllabus: 1 }, { unique: true });

export const BatchSyllabus = mongoose.model(
  "BatchSyllabus",
  batchSyllabusSchema
);
