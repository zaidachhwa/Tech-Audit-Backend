import mongoose from "mongoose";

const chapterSchema = new mongoose.Schema(
  {
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Syllabus",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

export const Chapter = mongoose.model("Chapter", chapterSchema);
export default Chapter;
