import { Syllabus } from "../models/syllabus.model.js";
import { Lecture } from "../models/lecture.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";

// ✅ UPDATE SYLLABUS
export const updateSyllabusService = async (id, data) => {
  return await Syllabus.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate("lectures")
    .populate("topics")
    .populate("assignedTeacher", "name email phone")
    .populate("createdBy", "name email");
};

// ✅ DELETE SYLLABUS
export const deleteSyllabusService = async (id) => {
  // Cascade delete associated lectures and batch assignments
  await Lecture.deleteMany({ syllabus: id });
  await BatchSyllabus.deleteMany({ syllabus: id });
  await BatchLecture.deleteMany({ syllabus: id });
  
  return await Syllabus.findByIdAndDelete(id);
};
