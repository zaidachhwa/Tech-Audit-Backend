import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
    batchName: String,
    batchNumber: Number,
    parameters: [
        {
            name: String,
            score: Number,
        },
    ],
    feedback: [String],
    date: Date,
});

export default mongoose.model("Assignment", assignmentSchema);