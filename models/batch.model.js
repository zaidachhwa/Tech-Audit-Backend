import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batch_name: { type: String, required: true },
    batch_no: { type: Number, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  },
  { timestamps: true }
);

export default mongoose.model("Batch", batchSchema);
