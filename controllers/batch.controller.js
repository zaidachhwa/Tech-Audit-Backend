import * as batchService from "../services/batch.service.js";

// ✅ PUBLIC: Get all batches (used currently)
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

// 🔥 NEW: Get UNIQUE batch names (FOR DROPDOWN)
export const getUniqueBatchNames = async (req, res) => {
  try {
    const Batch = (await import("../models/batch.model.js")).default;

    const names = await Batch.distinct("batch_name");

    return res.status(200).json(names);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 🔥 NEW: Get batch numbers based on selected name
export const getBatchNumbersByName = async (req, res) => {
  try {
    const { batch_name } = req.query;

    if (!batch_name) {
      return res.status(400).json({ message: "batch_name is required" });
    }

    const Batch = (await import("../models/batch.model.js")).default;

    const numbers = await Batch.distinct("batch_no", { batch_name });

    return res.status(200).json(numbers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ================= EXISTING CODE =================

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

export const updateBatch = async (req, res) => {
  try {
    const updatedBatch = await batchService.updateBatchService(
      req.params.id,
      req.body
    );

    if (!updatedBatch)
      return res.status(404).json({ message: "Batch not found" });

    return res
      .status(200)
      .json({ message: "Batch updated successfully", updatedBatch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const deletedBatch = await batchService.deleteBatchService(req.params.id);

    if (!deletedBatch)
      return res.status(404).json({ message: "Batch not found" });

    return res
      .status(200)
      .json({ message: "Batch deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};