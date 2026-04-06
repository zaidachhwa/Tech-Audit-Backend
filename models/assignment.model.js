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
    status: {
        type: String,
        enum: ["Pending", "Done"],
        default: "Pending"
    }
}, { timestamps: true });

export default mongoose.model("Assignment", assignmentSchema);