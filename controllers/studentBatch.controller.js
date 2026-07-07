import StudentBatchMapping from "../models/studentBatchMapping.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";

export const createMapping = async (req, res) => {
  try {
    const { studentId, batchId } = req.body;
    if (!studentId || !batchId) {
      return res.status(400).json({ message: "studentId and batchId are required" });
    }

    const student = await Student.findById(studentId);
    const batch = await Batch.findById(batchId);

    if (!student || !batch) {
      return res.status(404).json({ message: "Student or Batch not found" });
    }

    // Sync references
    batch.students = batch.students || [];
    if (!batch.students.includes(studentId)) {
      batch.students.push(studentId);
      await batch.save();
    }

    // Update student fields
    student.batch_name = batch.batch_name;
    student.batch_no = batch.batch_no;
    await student.save();

    // Check if mapping already exists
    let mapping = await StudentBatchMapping.findOne({ student: studentId, batch: batchId });
    if (!mapping) {
      mapping = await StudentBatchMapping.create({ student: studentId, batch: batchId });
    }

    res.status(201).json({ message: "Student batch mapping created", mapping });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMappings = async (req, res) => {
  try {
    const mappings = await StudentBatchMapping.find()
      .populate("student", "name email")
      .populate("batch", "batch_name batch_no name");
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { batchId } = req.body;

    const mapping = await StudentBatchMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    if (batchId) {
      const oldBatch = await Batch.findById(mapping.batch);
      if (oldBatch) {
        oldBatch.students.pull(mapping.student);
        await oldBatch.save();
      }

      const newBatch = await Batch.findById(batchId);
      if (newBatch) {
        newBatch.students = newBatch.students || [];
        if (!newBatch.students.includes(mapping.student)) {
          newBatch.students.push(mapping.student);
          await newBatch.save();
        }
        
        // Update student
        const student = await Student.findById(mapping.student);
        if (student) {
          student.batch_name = newBatch.batch_name;
          student.batch_no = newBatch.batch_no;
          await student.save();
        }
      }

      mapping.batch = batchId;
      await mapping.save();
    }

    res.json({ message: "Mapping updated successfully", mapping });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await StudentBatchMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    const batch = await Batch.findById(mapping.batch);
    if (batch) {
      batch.students.pull(mapping.student);
      await batch.save();
    }

    await StudentBatchMapping.findByIdAndDelete(id);
    res.json({ message: "Mapping deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
