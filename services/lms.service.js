import { LMS } from "../models/lms.model.js";
import Batch from "../models/batch.model.js";
import Student from "../models/student.model.js";
import StudentBatchMapping from "../models/studentBatchMapping.model.js";

// ─── Upload a new LMS resource ────────────────────────────────────────────────
export const createLmsService = async ({
  title,
  description,
  fileUrl,
  fileName,
  originalName,
  fileType,
  mimeType,
  fileSize,
  visibility,
  batches,
  uploadedBy,
  uploadedByRole,
}) => {
  // If visibility is "all", we ignore any batch list
  const batchIds = visibility === "all" ? [] : batches || [];

  const lms = new LMS({
    title,
    description,
    fileUrl,
    fileName,
    originalName,
    fileType,
    mimeType,
    fileSize,
    visibility,
    batches: batchIds,
    uploadedBy,
    uploadedByRole,
  });

  await lms.save();
  return lms;
};

// ─── Get all LMS resources (admin / teacher — no filter) ─────────────────────
export const getAllLmsService = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const total = await LMS.countDocuments();
  const items = await LMS.find()
    .populate("batches", "batch_name batch_no")
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { total, page, limit, items };
};

// ─── Helper: Get all batch IDs for a student ─────────────────────────────────
export const getStudentBatchIds = async (studentId) => {
  const batchIds = new Set();

  // 1. StudentBatchMapping
  const mappings = await StudentBatchMapping.find({ student: studentId }).lean();
  mappings.forEach((m) => m.batch && batchIds.add(m.batch.toString()));

  // 2. Direct Batch.students array
  const directBatches = await Batch.find({ students: studentId }).lean();
  directBatches.forEach((b) => batchIds.add(b._id.toString()));

  // 3. Match by student's batch_name and batch_no
  const student = await Student.findById(studentId).lean();
  if (student && student.batch_name && student.batch_no) {
    const nameBatches = await Batch.find({
      batch_name: student.batch_name,
      batch_no: student.batch_no,
    }).lean();
    nameBatches.forEach((b) => batchIds.add(b._id.toString()));
  }

  return Array.from(batchIds);
};

// ─── Get LMS resources visible to a specific student ─────────────────────────
export const getLmsForStudentService = async ({ studentId, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;

  const studentBatchIds = await getStudentBatchIds(studentId);

  const query = {
    $or: [
      { visibility: "all" },
      { visibility: "specific", batches: { $in: studentBatchIds } },
    ],
  };

  const total = await LMS.countDocuments(query);
  const items = await LMS.find(query)
    .populate("batches", "batch_name batch_no")
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { total, page, limit, items };
};

// ─── Get a single LMS resource by ID ─────────────────────────────────────────
export const getLmsById = async (id) => {
  return await LMS.findById(id)
    .populate("batches", "batch_name batch_no")
    .populate("uploadedBy", "name email")
    .lean();
};

// ─── Update LMS resource metadata ────────────────────────────────────────────
export const updateLmsService = async (id, data) => {
  if (data.visibility === "all") {
    data.batches = [];
  }
  return await LMS.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

// ─── Delete LMS resource ──────────────────────────────────────────────────────
export const deleteLmsService = async (id) => {
  return await LMS.findByIdAndDelete(id);
};
