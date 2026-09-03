import mongoose from "mongoose";

const examAttemptSchema = new mongoose.Schema(
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
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    endTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "auto_submitted", "expired"],
      default: "in_progress"
    },
    activeSessionId: {
      type: String,
      required: true
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        answer: {
          type: String,
          default: ""
        },
        isCorrect: {
          type: Boolean,
          default: false
        },
        marksAwarded: {
          type: Number,
          default: 0
        }
      }
    ],
    score: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    tabSwitchCount: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Ensure a student has only one attempt record per exam
examAttemptSchema.index({ exam: 1, student: 1 }, { unique: true });

const ExamAttempt = mongoose.model("ExamAttempt", examAttemptSchema);
export default ExamAttempt;
