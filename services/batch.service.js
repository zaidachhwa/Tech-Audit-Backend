import Batch from "../models/batch.model.js";
import { Student } from "../models/student.model.js";

export const createBatchService = async ({ batch_name, batch_no }) => {
  const existing = await Batch.findOne({ batch_name, batch_no });
  if (existing) throw new Error("Batch already exists");
  const batch = new Batch({ batch_name, batch_no });
  await batch.save();
  return batch;
};

export const getBatchesService = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const total = await Batch.countDocuments();
  const batches = await Batch.find()
    .populate("students")
    .skip(skip)
    .limit(limit)
    .lean();
  return { total, page, limit, batches };
};

export const addStudentToBatchService = async (batchId, studentId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) throw new Error("Batch not found");
  if (!batch.students.includes(studentId)) {
    batch.students.push(studentId);
    await batch.save();
  }
  await Student.findByIdAndUpdate(studentId, {
    batch_name: batch.batch_name,
    batch_no: batch.batch_no,
  });
  return batch;
};
