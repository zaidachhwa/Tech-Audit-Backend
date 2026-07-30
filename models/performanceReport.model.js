import mongoose from "mongoose";

const performanceReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    attendanceData: {
      workingDays: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
    auditData: [
      {
        reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
        auditDate: { type: Date },
        averageScore: { type: Number, default: 0 },
        overallRemarks: { type: String, default: "" },
      },
    ],
    statistics: {
      highestScore: { type: Number, default: 0 },
      lowestScore: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      overallGrade: { type: String, default: "" },
    },
    aiSummary: {
      strengths: { type: String, default: "" },
      weaknesses: { type: String, default: "" },
      areasOfImprovement: { type: String, default: "" },
      teacherRecommendation: { type: String, default: "" },
      learningProgress: { type: String, default: "" },
      attendanceImpact: { type: String, default: "" },
      futureRecommendation: { type: String, default: "" },
    },
    teacherRemarks: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export const PerformanceReport = mongoose.model("PerformanceReport", performanceReportSchema);
export default PerformanceReport;
