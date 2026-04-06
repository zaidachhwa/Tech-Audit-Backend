import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  batchName: String,
  batchNumber: Number,
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  parameters: [
    {
      name: String,
      score: Number,
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
  comment: {
    type: String,
    default: "",
  },
});

export default mongoose.model("Assignment", assignmentSchema);