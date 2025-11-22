import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending",
  },
  notes: { type: String, default: "" },
});

const outcomeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
});

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Intermediate",
  },
});

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    modules: { type: [moduleSchema], default: [] },
    overallStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Submitted", "Approved"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    outcomes: { type: [outcomeSchema], default: [] },
    skills: { type: [skillSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
