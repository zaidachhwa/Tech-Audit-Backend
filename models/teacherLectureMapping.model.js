import mongoose from "mongoose";

const teacherLectureMappingSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    // References to mapped lecture templates
    lectures: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
    }],
    // References to mapped batch-specific lectures
    batchLectures: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchLecture",
    }]
  },
  { timestamps: true }
);

export const TeacherLectureMapping = mongoose.model("TeacherLectureMapping", teacherLectureMappingSchema);
export default TeacherLectureMapping;
