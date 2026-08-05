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
  const cleanData = { ...data };
  delete cleanData._id;
  delete cleanData.createdAt;
  delete cleanData.updatedAt;
  delete cleanData.__v;

  if (cleanData.completionStatus === "Completed" && !cleanData.completedAt) {
    cleanData.completedAt = new Date();
  }

  // Handle populated ObjectId fields gracefully if passed as objects
  if (cleanData.teacher && typeof cleanData.teacher === "object") {
    cleanData.teacher = cleanData.teacher._id || null;
  }
  if (cleanData.chapterId && typeof cleanData.chapterId === "object") {
    cleanData.chapterId = cleanData.chapterId._id || null;
  }
  if (cleanData.referenceTo && typeof cleanData.referenceTo === "object") {
    cleanData.referenceTo = cleanData.referenceTo._id || null;
  }

  let updatedLecture = await Lecture.findByIdAndUpdate(id, cleanData, {
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
        status: updatedLecture.status,
        completionStatus: updatedLecture.completionStatus,
        completedAt: updatedLecture.completedAt,
        subLectures: updatedLecture.subLectures,
      }
    );
    return updatedLecture;
  }

  // Fallback: If id is a BatchLecture ID
  let updatedBatchLecture = await BatchLecture.findByIdAndUpdate(id, cleanData, {
    new: true,
    runValidators: true,
  });

  if (updatedBatchLecture) {
    if (updatedBatchLecture.templateLecture) {
      await Lecture.findByIdAndUpdate(updatedBatchLecture.templateLecture, {
        completionStatus: updatedBatchLecture.completionStatus,
        completedAt: updatedBatchLecture.completedAt,
        ...(cleanData.title && { title: cleanData.title }),
        ...(cleanData.description && { description: cleanData.description })
      });
    }
    return updatedBatchLecture;
  }

  return null;
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
    return await Lecture.findByIdAndDelete(id);
  }

  const batchLecture = await BatchLecture.findById(id);
  if (batchLecture) {
    return await BatchLecture.findByIdAndDelete(id);
  }

  return null;
};
