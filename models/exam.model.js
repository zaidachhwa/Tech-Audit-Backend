import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    examType: { type: String, enum: ["online", "offline"], required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    questionPaper: {
      fileName: String,
      fileUrl: String
    },
    // Online Exam Specific Fields (Optional, used when examType === 'online')
    startTime: { type: String }, // e.g., "10:00"
    endTime: { type: String }, // e.g., "11:00"
    durationMinutes: { type: Number, default: 60 },
    totalMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 40 },
    instructions: { type: String, default: "" },
    isPublished: { type: Boolean, default: true },
    questions: [
      {
        questionText: { type: String, required: true },
        questionType: {
          type: String,
          enum: ["mcq", "true_false", "short_answer"],
          default: "mcq"
        },
        options: [{ type: String }],
        correctAnswer: { type: String, required: true },
        marks: { type: Number, default: 1 }
      }
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByRole: { type: String, enum: ["admin", "teacher"], required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
