import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batch_name: { type: String, required: true },
    batch_no: { type: String, required: true },
    name: { type: String }, // alias for v2
    course: { type: String, default: "" }, // v2 field
    semester: { type: String, default: "" }, // v2 field
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
  },
  { timestamps: true }
);

batchSchema.index({ batch_name: 1, batch_no: 1 });
batchSchema.index({ course: 1, semester: 1 });
batchSchema.index({ students: 1 });

export default mongoose.model("Batch", batchSchema);
