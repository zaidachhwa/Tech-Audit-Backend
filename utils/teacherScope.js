import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";

/**
 * Resolve the Batch _ids a teacher is actually assigned to, derived from
 * BatchLecture.assignedTo/teacherIds and Schedule.teacher/lectures.teacher
 * (Batch itself has no teacher field).
 * @param {string} teacherId
 * @returns {Promise<string[]>} deduped batch id strings
 */
export async function getTeacherBatchIds(teacherId) {
  const [scheduleBatchIds, lectureBatchIds] = await Promise.all([
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
  ]);

  const ids = [
    ...scheduleBatchIds.map((s) => s.batch?.toString()).filter(Boolean),
    ...lectureBatchIds.map((l) => l.batch?.toString()).filter(Boolean),
  ];

  return [...new Set(ids)];
}
