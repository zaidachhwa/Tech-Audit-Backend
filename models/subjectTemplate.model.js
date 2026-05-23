import mongoose from "mongoose";

const templateLectureSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  notes_shared: {
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" }
  },
  notes_teacher: {
    fileName: { type: String, default: "" },
    fileUrl: { type: String, default: "" }
  }
});

const subjectTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    lectures: [templateLectureSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }
  },
  { timestamps: true }
);

export const SubjectTemplate = mongoose.model("SubjectTemplate", subjectTemplateSchema);
export default SubjectTemplate;
