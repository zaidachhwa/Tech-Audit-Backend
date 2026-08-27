import mongoose from "mongoose";

const examResultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true
    },
    marksObtained: {
      type: Number,
      required: true
    },
    totalMarks: {
      type: Number,
      required: true
    },
    grade: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ["Pass", "Fail"],
      required: true
    },
    remarks: {
      type: String
    },
    gradedPaper: {
      fileName: String,
      fileUrl: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    createdByRole: {
      type: String,
      enum: ["admin", "teacher"],
      required: true
    }
  },
  { timestamps: true }
);

// Ensure a student only has one result per exam
examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

const ExamResult = mongoose.model("ExamResult", examResultSchema);
export default ExamResult;
