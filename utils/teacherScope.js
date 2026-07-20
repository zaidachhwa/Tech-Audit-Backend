import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import Batch from "../models/batch.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Syllabus } from "../models/syllabus.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";

/**
 * Resolve the Batch _ids a teacher is actually assigned to, derived from
 * Batch.teachers, BatchSyllabus (via Syllabus assignedTeacher/assignedTeachers/subjects),
 * BatchLecture.assignedTo/teacherIds and Schedule.teacher/lectures.teacher
 * @param {string} teacherId
 * @returns {Promise<string[]>} deduped batch id strings
 */
export async function getTeacherBatchIds(teacherId) {
  const teacher = await Teacher.findById(teacherId).lean();
  const teacherSubjects = teacher?.subjects || [];

  const [scheduleBatchIds, lectureBatchIds, directBatches, syllabi] = await Promise.all([
    Schedule.find({
      $or: [{ teacher: teacherId }, { "lectures.teacher": teacherId }],
    })
      .select("batch")
      .lean(),
    BatchLecture.find({
      $or: [{ assignedTo: teacherId }, { teacherIds: teacherId }],
    })
      .select("batch")
      .lean(),
    Batch.find({
      $or: [{ teachers: teacherId }, { teacherId: teacherId }],
    })
      .select("_id")
      .lean(),
    Syllabus.find({
      $or: [
        { assignedTeacher: teacherId },
        { assignedTeachers: teacherId },
      ],
    })
      .select("_id")
      .lean(),
  ]);

  const syllabusIds = syllabi.map((s) => s._id);
  const batchSyllabi =
    syllabusIds.length > 0
      ? await BatchSyllabus.find({ syllabus: { $in: syllabusIds } })
          .select("batch")
          .lean()
      : [];

  const ids = [
    ...scheduleBatchIds.map((s) => s.batch?.toString()).filter(Boolean),
    ...lectureBatchIds.map((l) => l.batch?.toString()).filter(Boolean),
    ...directBatches.map((b) => b._id?.toString()).filter(Boolean),
    ...batchSyllabi.map((bs) => bs.batch?.toString()).filter(Boolean),
  ];

  return [...new Set(ids)];
}

