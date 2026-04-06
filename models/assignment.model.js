import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
    batchName: String,
    batchNumber: String,
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    parameters: [
        {
            name: String,
            score: Number,
        },
    ],
    date: { type: Date },
    comment: {
        type: String,
        default: "",
    },
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);