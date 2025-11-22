import * as batchService from "../services/batch.service.js";

export const getPublicBatches = async (req, res) => {
  try {
    const batches = await (await import("../models/batch.model.js")).default
      .find({}, "batch_name batch_no")
      .lean();

    return res.status(200).json(batches);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const createBatch = async (req, res) => {
  try {
    const { batch_name, batch_no } = req.body;
    if (!batch_name || !batch_no)
      return res
        .status(400)
        .json({ message: "batch_name & batch_no required" });
    const batch = await batchService.createBatchService({
      batch_name,
      batch_no,
    });
    return res.status(201).json({ message: "Batch created", batch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await batchService.getBatchesService({
      page: Number(page),
      limit: Number(limit),
    });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getBatchById = async (req, res) => {
  try {
    const batch = await (await import("../models/batch.model.js")).default
      .findById(req.params.id)
      .populate("students")
      .lean();
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    return res.status(200).json(batch);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const addStudentToBatch = async (req, res) => {
  try {
    const { studentId } = req.body;
    const batch = await batchService.addStudentToBatchService(
      req.params.id,
      studentId
    );
    return res.status(200).json({ message: "Student added", batch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
