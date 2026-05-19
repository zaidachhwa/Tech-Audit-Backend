import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  date: { type: Date, required: true },
  status: { type: String, enum: ["Planned", "Scheduled", "Done"], default: "Planned" },
  homework: {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    due_date: { type: Date },
    accept_submissions: { type: Boolean, default: true }
  }
});

const scheduleSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    lectures: [lectureSchema]
  },
  { timestamps: true }
);

export const Schedule = mongoose.model("Schedule", scheduleSchema);
export default Schedule;
