import mongoose from "mongoose";

const batchLectureSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    syllabus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syllabus",
      required: true,
    },
    templateLecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    dueDate: { type: Date },
    chapterId: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    lectureType: {
      type: String,
      enum: ["Normal", "Reference"],
      default: "Normal"
    },
    order: { type: Number, default: 0 },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    teacherIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Teacher" }],
    status: { type: String, default: "active" },
    completionStatus: {
      type: String,
      enum: ["Yet to be scheduled", "Pending", "In Progress", "Completed"],
      default: "Yet to be scheduled",
    },
    completedAt: { type: Date },
    remarks: { type: String, default: "" },
    
    punchInTime: { type: Date, default: null },
    punchOutTime: { type: Date, default: null },
    punchInNotes: { type: String, default: "" },
    punchOutNotes: { type: String, default: "" },
    punchInFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" }
    },
    punchOutFile: {
      fileName: { type: String, default: "" },
      fileUrl: { type: String, default: "" }
    },
    punchStatus: {
      type: String,
      enum: ["PENDING", "PUNCHED_IN", "PUNCHED_OUT"],
      default: "PENDING"
    },

    subLectures: [
      {
        title: { type: String, required: true },
        duration: { type: Number, default: 0 },
        order: { type: Number, default: 0 },
        completionStatus: {
          type: String,
          enum: ["Yet to be scheduled", "Pending", "In Progress", "Completed"],
          default: "Yet to be scheduled"
        }
      }
    ],
    referenceTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      default: null
    },

    venue: { type: String, default: "" },

    isTransferred: { type: Boolean, default: false },
    originalTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    transferHistory: [
      {
        oldTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
        newTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
        date: { type: Date, default: Date.now },
        reason: { type: String, default: "" }
      }
    ],

    studentsProgress: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
        status: {
          type: String,
          enum: ["Yet to be scheduled", "Pending", "In Progress", "Completed"],
          default: "Yet to be scheduled",
        },
        remarks: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

batchLectureSchema.index({ batch: 1, assignedTo: 1 });
batchLectureSchema.index({ syllabus: 1, batch: 1 });

export const BatchLecture = mongoose.model("BatchLecture", batchLectureSchema);
export default BatchLecture;
