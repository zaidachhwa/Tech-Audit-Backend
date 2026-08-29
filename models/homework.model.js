import mongoose from "mongoose";

const homeworkSubmissionSchema = new mongoose.Schema({
  submissionText: { type: String, default: "" },
  fileName: { type: String },
  fileUrl: { type: String },
  attachments: [{ type: String }],
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["assigned", "pending_review", "approved", "rejected"],
    default: "pending_review"
  },
  marks: {
    type: Number,
    min: [0, "Obtained marks cannot be negative"],
    validate: {
      validator: function(val) {
        if (val === undefined || val === null) return true;
        if (this.outOf !== undefined && this.outOf !== null) {
          return val <= this.outOf;
        }
        return true;
      },
      message: "Obtained marks cannot exceed total marks (outOf)"
    }
  },
  outOf: {
    type: Number,
    min: [0.01, "Total marks must be greater than zero"]
  },
  remarks: { type: String, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  reviewedAt: { type: Date }
});

const homeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    comment: { type: String, default: "" },
    course: { type: String, default: "" },
    semester: { type: String, default: "" },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    subjectName: { type: String, default: "" },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    batchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
    batchName: { type: String, default: "" },
    batchNumber: { type: mongoose.Schema.Types.Mixed, default: "" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture" },
    batchLecture: { type: mongoose.Schema.Types.ObjectId, ref: "BatchLecture" },
    parameters: [
      {
        name: String,
        score: Number,
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ["assigned", "pending_review", "approved", "rejected"],
      default: "assigned",
    },
    marks: { type: Number },
    outOf: { type: Number },
    remarks: { type: String, default: "" },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    submissions: [homeworkSubmissionSchema],
  },
  { timestamps: true }
);

// Performance Indexes
homeworkSchema.index({ student: 1, createdAt: -1 });
homeworkSchema.index({ assignedBy: 1, createdAt: -1 });
homeworkSchema.index({ batch: 1, status: 1 });
homeworkSchema.index({ lecture: 1, student: 1 });
homeworkSchema.index({ status: 1, createdAt: -1 });
homeworkSchema.index({ course: 1, semester: 1 });

export const Homework = mongoose.model("Homework", homeworkSchema);
export default Homework;
