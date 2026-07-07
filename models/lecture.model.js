import mongoose from "mongoose";

const subLectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, default: 0 }, // in minutes
  order: { type: Number, default: 0 },
  completionStatus: {
    type: String,
    enum: ["Pending", "In Progress", "Completed"],
    default: "Pending"
  }
});

const lectureSchema = new mongoose.Schema(
  {
    syllabus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syllabus",
      required: true,
    },
    title: { type: String, required: true }, // Lecture Name
    description: { type: String, default: "" },
    chapterId: { type: String, default: "" },
    duration: { type: Number, default: 0 }, // Lecture duration in minutes
    lectureType: {
      type: String,
      enum: ["Normal", "Reference"],
      default: "Normal"
    },
    batchIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch"
    }],
    order: { type: Number, default: 0 },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    completionStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    completedAt: { type: Date },
    remarks: { type: String, default: "" },
    subLectures: [subLectureSchema],
    
    // Optional student-level template progress
    studentsProgress: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },
        remarks: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export const Lecture = mongoose.model("Lecture", lectureSchema);
export default Lecture;
