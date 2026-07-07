import mongoose from "mongoose";

const studentBatchMappingSchema = new mongoose.Schema(
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
    }
  },
  { timestamps: true }
);

export const StudentBatchMapping = mongoose.model("StudentBatchMapping", studentBatchMappingSchema);
export default StudentBatchMapping;
