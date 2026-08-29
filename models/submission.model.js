import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", required: true },
    lectureId: { type: String, required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ["pending", "reviewed"], default: "pending" }
  },
  { timestamps: true }
);

submissionSchema.index({ schedule: 1, lectureId: 1, student: 1 });
submissionSchema.index({ student: 1, createdAt: -1 });

export const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
