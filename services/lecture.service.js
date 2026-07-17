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
    .populate("topics") // backwards compatibility
    .populate("assignedTeacher", "name email phone")
    .populate("assignedTeachers", "name email phone")
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

// ✅ UPDATE LECTURE
export const updateLectureService = async (id, data) => {
  const updatedLecture = await Lecture.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (updatedLecture) {
    // Sync to all BatchLecture copies
    await BatchLecture.updateMany(
      { templateLecture: id },
      {
        title: updatedLecture.title,
        description: updatedLecture.description,
        chapterId: updatedLecture.chapterId,
        duration: updatedLecture.duration,
        lectureType: updatedLecture.lectureType,
        order: updatedLecture.order,
        referenceTo: updatedLecture.referenceTo || null,
      }
    );
  }
  return updatedLecture;
};

// ✅ DELETE LECTURE
export const deleteLectureService = async (id) => {
  const lecture = await Lecture.findById(id);
  if (lecture) {
    // Remove from parent Syllabus
    await Syllabus.findByIdAndUpdate(lecture.syllabus, {
      $pull: { lectures: lecture._id, topics: lecture._id }
    });
    // Delete assigned batch lectures
    await BatchLecture.deleteMany({ templateLecture: id });
  }
  return await Lecture.findByIdAndDelete(id);
};
