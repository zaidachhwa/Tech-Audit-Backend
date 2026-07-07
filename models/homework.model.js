import mongoose from "mongoose";

const homeworkSubmissionSchema = new mongoose.Schema({
  submissionText: { type: String, default: "" },
  fileName: { type: String },
  fileUrl: { type: String }, // Base64 encoding string or cloud file URL
  submittedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Submitted", "Pending Approval", "Approved", "Rejected"],
    default: "Pending Approval"
  },
  remarks: { type: String, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  reviewedAt: { type: Date }
});

const homeworkSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    batchName: String,
    batchNumber: Number,
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }, // Assigned student
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: "Lecture" },
    batchLecture: { type: mongoose.Schema.Types.ObjectId, ref: "BatchLecture" },
    parameters: [
      {
        name: String,
        score: Number, // Holds grades when approved
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
    comment: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Assigned", "Submitted", "Pending Approval", "Approved", "Rejected"],
      default: "Assigned",
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    submissions: [homeworkSubmissionSchema], // Submission history
  },
  { timestamps: true }
);

export const Homework = mongoose.model("Homework", homeworkSchema);
export default Homework;
