import * as batchService from "../services/batch.service.js";
import jwt from "jsonwebtoken";
import { getTeacherBatchIds } from "../utils/teacherScope.js";
import { JWT_SECRET } from "../config/env.js";

// ─── Helper: Get Batch IDs allocated to a specific Teacher ───────────────────
export const getTeacherAllocatedBatchIds = async (teacherId) => {
  return await getTeacherBatchIds(teacherId);
};


// ✅ PUBLIC: Get all batches (used currently, filtered if called by a Teacher)
export const getPublicBatches = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let teacherId = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.role === "teacher") {
          teacherId = decoded.id;
        }
      } catch (e) {
        // Token invalid, fall back to default public behavior
      }
    }

    const Batch = (await import("../models/batch.model.js")).default;
    let query = {};

    if (teacherId) {
      const allocatedBatchIds = await getTeacherAllocatedBatchIds(teacherId);
      query = { _id: { $in: allocatedBatchIds } };
    }

    const batches = await Batch.find(query, "batch_name batch_no").lean();
    return res.status(200).json(batches);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 🔥 NEW: Get UNIQUE batch names (FOR DROPDOWN)
export const getUniqueBatchNames = async (req, res) => {
  try {
    const Batch = (await import("../models/batch.model.js")).default;
    let query = {};

    if (req.user && req.user.role === "teacher") {
      const allocatedBatchIds = await getTeacherAllocatedBatchIds(req.user.id);
      query = { _id: { $in: allocatedBatchIds } };
    }

    const names = await Batch.distinct("batch_name", query);
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
    let query = { batch_name };

    if (req.user && req.user.role === "teacher") {
      const allocatedBatchIds = await getTeacherAllocatedBatchIds(req.user.id);
      query._id = { $in: allocatedBatchIds };
    }

    const numbers = await Batch.distinct("batch_no", query);
    return res.status(200).json(numbers);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ================= EXISTING CODE =================

export const createBatch = async (req, res) => {
  try {
    const { batch_name, batch_no, name, course, semester } = req.body;
    const finalBatchName = batch_name || name;
    const finalBatchNo = batch_no || "1";
    if (!finalBatchName) {
      return res.status(400).json({ message: "batch_name or name required" });
    }

    const batch = await batchService.createBatchService({
      batch_name: finalBatchName,
      batch_no: finalBatchNo,
      name: finalBatchName,
      course: course || "",
      semester: semester || ""
    });

    return res.status(201).json({ message: "Batch created", batch });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    if (req.user && req.user.role === "teacher") {
      const allocatedBatchIds = await getTeacherAllocatedBatchIds(req.user.id);
      const Batch = (await import("../models/batch.model.js")).default;
      const total = allocatedBatchIds.length;
      const batches = await Batch.find({ _id: { $in: allocatedBatchIds } })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();

      return res.status(200).json({ total, page: Number(page), limit: Number(limit), batches });
    }

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

export const assignTeachersToBatch = async (req, res) => {
  try {
    const Batch = (await import("../models/batch.model.js")).default;
    const { teacherIds } = req.body;
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { teachers: teacherIds || [] },
      { new: true }
    ).populate("teachers", "name email phone");

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    return res.status(200).json({ message: "Teachers assigned to batch successfully", batch });
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