import Batch from "../models/batch.model.js";
import { Student } from "../models/student.model.js";


// ✅ CREATE BATCH (WITH DUPLICATE CHECK)
export const createBatchService = async ({ batch_name, batch_no, name, course, semester }) => {
  const existing = await Batch.findOne({ batch_name, batch_no });
  if (existing) throw new Error("Batch already exists");

  const batch = new Batch({ batch_name, batch_no, name, course, semester });
  await batch.save();
  return batch;
};


// ✅ GET ALL BATCHES WITH PAGINATION
export const getBatchesService = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const total = await Batch.countDocuments();
  const batches = await Batch.find()
    .populate("students")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  return { total, page, limit, batches };
};


// ✅ ADD STUDENT TO BATCH + UPDATE STUDENT RECORD
export const addStudentToBatchService = async (batchId, studentId) => {
  const batch = await Batch.findById(batchId);
  if (!batch) throw new Error("Batch not found");

  if (!batch.students.includes(studentId)) {
    batch.students.push(studentId);
    await batch.save();
  }

  // ✅ Update student's batch info
  await Student.findByIdAndUpdate(studentId, {
    batch_name: batch.batch_name,
    batch_no: batch.batch_no,
  });

  return batch;
};


// ✅ ✅ UPDATE BATCH
export const updateBatchService = async (id, data) => {
  return await Batch.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};


// ✅ ✅ DELETE BATCH
export const deleteBatchService = async (id) => {
  return await Batch.findByIdAndDelete(id);
};
