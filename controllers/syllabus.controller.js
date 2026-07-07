import { Syllabus } from "../models/syllabus.model.js";
import { Lecture } from "../models/lecture.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import Batch from "../models/batch.model.js";
import { Teacher } from "../models/teacher.model.js";
import * as syllabusService from "../services/syllabus.service.js";

/**
 * ============================================
 * ADMIN - TEMPLATE MANAGEMENT
 * ============================================
 */

/**
 * Create syllabus template (master template)
 */
export const createSyllabus = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const syllabus = await Syllabus.create({
      subject,
      description,
      createdBy: req.user.id,
    });
    res.status(201).json({ message: "Syllabus template created", syllabus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all syllabus templates
 */
export const getAllSyllabi = async (req, res) => {
  try {
    const syllabi = await Syllabus.find()
      .populate({
        path: "lectures",
        populate: {
          path: "assignedTo",
          select: "name email phone",
        },
      })
      .populate({
        path: "topics", // compatibility
        populate: {
          path: "assignedTo",
          select: "name email phone",
        },
      })
      .populate("assignedTeacher", "name email phone")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ syllabi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get single syllabus template with lectures
 */
export const getSyllabusById = async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.syllabusId)
      .populate({
        path: "lectures",
        populate: {
          path: "assignedTo",
          select: "name email phone",
        },
      })
      .populate({
        path: "topics", // compatibility
        populate: {
          path: "assignedTo",
          select: "name email phone",
        },
      })
      .populate("assignedTeacher", "name email phone")
      .populate("createdBy", "name email");

    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    res.json({ syllabus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * ADMIN - BATCH ASSIGNMENT
 * ============================================
 */

/**
 * Assign syllabus template to specific batch
 * Creates batch-specific copies of all lectures
 */
export const assignSyllabusToBatch = async (req, res) => {
  try {
    const { syllabusId, batchId, notes, dueDate } = req.body;

    if (!syllabusId || !batchId) {
      return res.status(400).json({
        message: "syllabusId and batchId required",
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const syllabus = await Syllabus.findById(syllabusId).populate("lectures");
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    const existing = await BatchSyllabus.findOne({
      batch: batchId,
      syllabus: syllabusId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Syllabus already assigned to this batch",
      });
    }

    const batchSyllabus = await BatchSyllabus.create({
      batch: batchId,
      syllabus: syllabusId,
      assignedBy: req.user.id,
      notes: notes || "",
      dueDate: dueDate,
    });

    const templateLectures = await Lecture.find({ syllabus: syllabusId });

    let createdBatchLectures = [];
    if (templateLectures.length > 0) {
      const batchLectureDocs = templateLectures.map((lecture) => ({
        batch: batchId,
        syllabus: syllabusId,
        templateLecture: lecture._id,
        title: lecture.title,
        description: lecture.description,
        chapterId: lecture.chapterId,
        duration: lecture.duration,
        lectureType: lecture.lectureType,
        order: lecture.order,
        completionStatus: "Pending",
        subLectures: lecture.subLectures.map(sl => ({
          title: sl.title,
          duration: sl.duration,
          order: sl.order,
          completionStatus: "Pending"
        }))
      }));
      createdBatchLectures = await BatchLecture.insertMany(batchLectureDocs);
    }

    res.status(201).json({
      message: "Syllabus assigned to batch successfully",
      batchSyllabus,
      topicsCreated: createdBatchLectures.length, // compatibility
      topics: createdBatchLectures, // compatibility
      lecturesCreated: createdBatchLectures.length,
      lectures: createdBatchLectures,
    });
  } catch (err) {
    console.error("Error assigning syllabus to batch:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Assign teacher to all lectures in a syllabus template
 */
export const assignTeacherToSyllabus = async (req, res) => {
  try {
    const { syllabusId } = req.params;
    const { teacherId } = req.body;

    if (!syllabusId || !teacherId) {
      return res.status(400).json({
        message: "syllabusId and teacherId required",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const syllabus = await Syllabus.findById(syllabusId).populate("lectures");
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Update all template lectures
    await Lecture.updateMany(
      { syllabus: syllabusId },
      { assignedTo: teacherId }
    );

    // Update syllabus assigned teacher
    const updatedSyllabus = await Syllabus.findByIdAndUpdate(
      syllabusId,
      { assignedTeacher: teacherId },
      { new: true }
    )
      .populate("lectures")
      .populate("assignedTeacher", "name email phone")
      .populate("createdBy", "name email");

    res.json({
      message: `Teacher assigned to syllabus "${syllabus.subject}" and all lectures updated`,
      syllabus: updatedSyllabus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Unassign teacher from all lectures in a syllabus template
 */
export const unassignTeacherFromSyllabus = async (req, res) => {
  try {
    const { syllabusId } = req.params;
    const { teacherId } = req.body;

    if (!syllabusId || !teacherId) {
      return res.status(400).json({
        message: "syllabusId and teacherId required",
      });
    }

    const syllabus = await Syllabus.findById(syllabusId);
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    if (syllabus.assignedTeacher?.toString() === teacherId) {
      syllabus.assignedTeacher = null;
      await syllabus.save();
    }

    await Lecture.updateMany(
      { syllabus: syllabusId, assignedTo: teacherId },
      { assignedTo: null }
    );
    
    await BatchLecture.updateMany(
      { syllabus: syllabusId, assignedTo: teacherId },
      { assignedTo: null }
    );

    res.json({
      message: `Teacher unassigned from syllabus "${syllabus.subject}"`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all batch syllabus instances
 */
export const getBatchSyllabi = async (req, res) => {
  try {
    const instances = await BatchSyllabus.find()
      .populate("batch", "batch_name batch_no students")
      .populate("syllabus", "subject description")
      .populate("assignedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ instances });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete batch syllabus assignment (and all its lectures)
 */
export const deleteBatchSyllabus = async (req, res) => {
  try {
    const { batchSyllabusId } = req.params;

    const batchSyllabus = await BatchSyllabus.findById(batchSyllabusId);
    if (!batchSyllabus) {
      return res.status(404).json({ message: "Batch syllabus not found" });
    }

    await BatchLecture.deleteMany({
      batch: batchSyllabus.batch,
      syllabus: batchSyllabus.syllabus,
    });

    await BatchSyllabus.findByIdAndDelete(batchSyllabusId);

    res.json({
      message: "Batch syllabus assignment deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all batches with their assigned syllabi
 */
export const getBatchesWithSyllabi = async (req, res) => {
  try {
    const batches = await Batch.find().select("batch_name batch_no students");

    const batchesWithSyllabi = await Promise.all(
      batches.map(async (batch) => {
        const assignedSyllabi = await BatchSyllabus.find({ batch: batch._id })
          .populate("syllabus", "subject description")
          .populate("assignedBy", "name email");

        return {
          ...batch.toObject(),
          assignedSyllabi,
        };
      })
    );

    res.json({ batches: batchesWithSyllabi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Return batches and assigned syllabi visible to teacher/admin
 */
export const getAssignedSyllabiForTeacher = async (req, res) => {
  try {
    const { batchId } = req.query;

    if (batchId) {
      const batch = await Batch.findById(batchId).select(
        "batch_name batch_no students"
      );
      if (!batch) return res.status(404).json({ message: "Batch not found" });

      const assignedSyllabi = await BatchSyllabus.find({ batch: batchId })
        .populate("syllabus", "subject description lectures topics")
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 });

      return res.json({ batch: batch.toObject(), assignedSyllabi });
    }

    const batches = await Batch.find().select("batch_name batch_no students");

    const batchesWithSyllabi = await Promise.all(
      batches.map(async (b) => {
        const assignedSyllabi = await BatchSyllabus.find({ batch: b._id })
          .populate("syllabus", "subject description lectures topics")
          .populate("assignedBy", "name email")
          .sort({ createdAt: -1 });

        return {
          _id: b._id,
          batch_name: b.batch_name,
          batch_no: b.batch_no,
          students: b.students || [],
          assignedSyllabi,
        };
      })
    );

    res.json({ batches: batchesWithSyllabi });
  } catch (err) {
    console.error("getAssignedSyllabiForTeacher error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update syllabus template metadata
 */
export const updateSyllabus = async (req, res) => {
  try {
    const updated = await syllabusService.updateSyllabusService(
      req.params.syllabusId,
      req.body
    );

    if (!updated)
      return res.status(404).json({ message: "Syllabus not found" });

    return res.status(200).json({
      message: "Syllabus updated successfully",
      updated,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Delete syllabus template
 */
export const deleteSyllabus = async (req, res) => {
  try {
    const deleted = await syllabusService.deleteSyllabusService(
      req.params.syllabusId
    );

    if (!deleted)
      return res.status(404).json({ message: "Syllabus not found" });

    return res.status(200).json({
      message: "Syllabus deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
