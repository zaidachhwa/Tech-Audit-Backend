import mongoose from "mongoose";

const gradeEntrySchema = new mongoose.Schema({
  assignment: { type: String, required: true },
  score: { type: Number, default: null },
  maxScore: { type: Number, default: 100 },
});

const gradeSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    grades: [gradeEntrySchema],
  },
  { timestamps: true }
);

gradeSchema.index({ batch: 1, student: 1, teacher: 1 }, { unique: true });

const Grade = mongoose.model("Grade", gradeSchema);

export default Grade;
