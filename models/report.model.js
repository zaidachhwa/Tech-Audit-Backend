import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  point1: { type: String, required: false },
  point2: { type: String, required: false },
  point3: { type: String, required: false },
});

const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
});

const reportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    parameters: { type: [parameterSchema], default: [] },
    feedbackSchema: { type: [feedbackSchema], default: [] },
    overallRemarks: { type: String, default: "" },
    auditDate: { type: Date, default: Date.now },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
