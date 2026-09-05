import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  point1: { type: String, required: false },
  point2: { type: String, required: false },
  point3: { type: String, required: false },
});

const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  totalScore: { type: Number, required: true, default: 10 },
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

    status:{type: String, enum:["draft","final"],default:"final"},
    reportType: { type: String, enum: ["audit", "exam"], default: "audit" },
    examSummary: {
      totalExamsAttempted: { type: Number, default: 0 },
      averagePercentage: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      lowestScore: { type: Number, default: 0 },
      overallStatus: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);
