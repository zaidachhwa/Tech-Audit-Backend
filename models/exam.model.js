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
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdByRole: { type: String, enum: ["admin", "teacher"], required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Exam", examSchema);
