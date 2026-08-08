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
    const { subject, name, code, description } = req.body;
    const finalSubject = subject || name;
    if (!finalSubject) {
      return res.status(400).json({ message: "subject or name is required" });
    }
    const syllabus = await Syllabus.create({
      subject: finalSubject,
      name: finalSubject,
      code: code || "",
      description: description || "",
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
    let query = {};
    if (req.user && req.user.role === "teacher") {
      query = {
        $or: [
          { assignedTeacher: req.user.id },
          { assignedTeachers: req.user.id },
        ],
      };
    }

    const syllabi = await Syllabus.find(query)
      .populate({
        path: "lectures",
        populate: [
          { path: "assignedTo", select: "name email phone" },
          { path: "referenceTo", select: "title description duration" }
        ],
      })
      .populate({
        path: "topics", // compatibility
        populate: [
          { path: "assignedTo", select: "name email phone" },
          { path: "referenceTo", select: "title description duration" }
        ],
      })
      .populate("assignedTeacher", "name email phone")
      .populate("assignedTeachers", "name email phone")
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
        populate: [
          { path: "assignedTo", select: "name email phone" },
          { path: "referenceTo", select: "title description duration" }
        ],
      })
      .populate({
        path: "topics", // compatibility
        populate: [
          { path: "assignedTo", select: "name email phone" },
          { path: "referenceTo", select: "title description duration" }
        ],
      })
      .populate("assignedTeacher", "name email phone")
      .populate("assignedTeachers", "name email phone")
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
    const { syllabusId, batchId, batchIds, notes, dueDate } = req.body;

    const finalBatchIds = batchIds || (batchId ? [batchId] : []);

    if (!syllabusId || finalBatchIds.length === 0) {
      return res.status(400).json({
        message: "syllabusId and batchId/batchIds required",
      });
    }

    const syllabus = await Syllabus.findById(syllabusId).populate("lectures");
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    const templateLectures = await Lecture.find({ syllabus: syllabusId });
    const assignedBatches = [];
    let totalLecturesCreated = 0;

    // Unassign any batches that were removed/unchecked for this syllabus
    const previousBatchSyllabi = await BatchSyllabus.find({ syllabus: syllabusId });
    const previousBatchIds = previousBatchSyllabi.map(bs => bs.batch.toString());
    const finalBatchIdsStr = finalBatchIds.map(id => id.toString());
    const removedBatchIds = previousBatchIds.filter(id => !finalBatchIdsStr.includes(id));

    if (removedBatchIds.length > 0) {
      await BatchSyllabus.deleteMany({ syllabus: syllabusId, batch: { $in: removedBatchIds } });
      await BatchLecture.deleteMany({ syllabus: syllabusId, batch: { $in: removedBatchIds } });
    }

    for (const bId of finalBatchIds) {
      const batch = await Batch.findById(bId);
      if (!batch) {
        continue;
      }

      // Check if already assigned
      let batchSyllabus = await BatchSyllabus.findOne({
        batch: bId,
        syllabus: syllabusId,
      });

      if (!batchSyllabus) {
        batchSyllabus = await BatchSyllabus.create({
          batch: bId,
          syllabus: syllabusId,
          assignedBy: req.user.id,
          notes: notes || "",
          dueDate: dueDate || null,
        });
      } else {
        if (notes) batchSyllabus.notes = notes;
        if (dueDate) batchSyllabus.dueDate = dueDate;
        await batchSyllabus.save();
      }

      assignedBatches.push(batchSyllabus);

      if (templateLectures.length > 0) {
        // Find existing BatchLectures for this batch & syllabus
        const existingBatchLectures = await BatchLecture.find({
          batch: bId,
          syllabus: syllabusId
        });
        const existingTemplateIds = new Set(existingBatchLectures.map(bl => bl.templateLecture?.toString()));

        const missingLectures = templateLectures.filter(l => !existingTemplateIds.has(l._id.toString()));

        if (missingLectures.length > 0) {
          const batchLectureDocs = missingLectures.map((lecture) => ({
            batch: bId,
            syllabus: syllabusId,
            templateLecture: lecture._id,
            title: lecture.title,
            description: lecture.description,
            chapterId: lecture.chapterId,
            duration: lecture.duration,
            lectureType: lecture.lectureType,
            order: lecture.order,
            completionStatus: "Yet to be scheduled",
            subLectures: (lecture.subLectures || []).map(sl => ({
              title: sl.title,
              duration: sl.duration,
              order: sl.order,
              completionStatus: "Yet to be scheduled"
            }))
          }));
          const createdBatchLectures = await BatchLecture.insertMany(batchLectureDocs);
          totalLecturesCreated += createdBatchLectures.length;
        }
      }
    }

    res.status(200).json({
      message: `Syllabus assigned to ${assignedBatches.length} batch(es) successfully`,
      assignedBatches,
      topicsCreated: totalLecturesCreated, // compatibility
      topics: [], // compatibility
      lecturesCreated: totalLecturesCreated,
      lectures: [],
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
    const { teacherId, teacherIds } = req.body;

    const finalTeacherIds = teacherIds || (teacherId ? [teacherId] : []);

    if (!syllabusId || finalTeacherIds.length === 0) {
      return res.status(400).json({
        message: "syllabusId and teacherId/teacherIds required",
      });
    }

    const teachersExist = await Teacher.find({ _id: { $in: finalTeacherIds } });
    if (teachersExist.length !== finalTeacherIds.length) {
      return res.status(404).json({ message: "One or more teachers not found" });
    }

    const syllabus = await Syllabus.findById(syllabusId).populate("lectures");
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Update all template lectures
    await Lecture.updateMany(
      { syllabus: syllabusId },
      { 
        assignedTo: finalTeacherIds[0] || null,
        teacherIds: finalTeacherIds 
      }
    );

    // Sync Teacher.subjects: add this subject to every newly-assigned teacher,
    // dedup automatically via $addToSet, and drop it from teachers who lost
    // this assignment (only if they have no other syllabus assigning the same subject).
    const previousTeacherIds = (syllabus.assignedTeachers || []).map((id) => id.toString());
    const newTeacherIdsStr = finalTeacherIds.map((id) => id.toString());
    const removedTeacherIds = previousTeacherIds.filter((id) => !newTeacherIdsStr.includes(id));

    await Teacher.updateMany(
      { _id: { $in: finalTeacherIds } },
      { $addToSet: { subjects: syllabus.subject } }
    );

    for (const tId of removedTeacherIds) {
      const stillAssignedElsewhere = await Syllabus.exists({
        subject: syllabus.subject,
        assignedTeachers: tId,
        _id: { $ne: syllabusId },
      });
      if (!stillAssignedElsewhere) {
        await Teacher.updateOne({ _id: tId }, { $pull: { subjects: syllabus.subject } });
      }
    }

    // Update syllabus assigned teachers
    const updatedSyllabus = await Syllabus.findByIdAndUpdate(
      syllabusId,
      { 
        assignedTeacher: finalTeacherIds[0] || null,
        assignedTeachers: finalTeacherIds 
      },
      { new: true }
    )
      .populate("lectures")
      .populate("assignedTeacher", "name email phone")
      .populate("assignedTeachers", "name email phone")
      .populate("createdBy", "name email");

    res.json({
      message: `Teachers assigned to syllabus "${syllabus.subject}" and all lectures updated`,
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
    }

    if (syllabus.assignedTeachers && syllabus.assignedTeachers.length > 0) {
      syllabus.assignedTeachers = syllabus.assignedTeachers.filter(
        (id) => id.toString() !== teacherId
      );
    }
    await syllabus.save();

    const stillAssignedElsewhere = await Syllabus.exists({
      subject: syllabus.subject,
      $or: [
        { assignedTeacher: teacherId },
        { assignedTeachers: teacherId },
      ],
    });
    if (!stillAssignedElsewhere) {
      await Teacher.updateOne({ _id: teacherId }, { $pull: { subjects: syllabus.subject } });
    }

    await Lecture.updateMany(
      { syllabus: syllabusId, assignedTo: teacherId },
      { assignedTo: null }
    );
    await Lecture.updateMany(
      { syllabus: syllabusId },
      { $pull: { teacherIds: teacherId } }
    );
    
    await BatchLecture.updateMany(
      { syllabus: syllabusId, assignedTo: teacherId },
      { assignedTo: null }
    );
    await BatchLecture.updateMany(
      { syllabus: syllabusId },
      { $pull: { teacherIds: teacherId } }
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
    const teacherId = req.user.id;

    // 1. Get teacher's details & subjects
    const teacher = await Teacher.findById(teacherId).lean();
    const teacherSubjects = teacher?.subjects || [];

    // 2. Find all syllabi assigned to this teacher
    const assignedSyllabiList = await Syllabus.find({
      $or: [
        { assignedTeacher: teacherId },
        { assignedTeachers: teacherId },
      ],
    }).lean();

    const teacherSyllabusIds = assignedSyllabiList.map((s) => s._id);

    if (batchId) {
      const batch = await Batch.findById(batchId).select(
        "batch_name batch_no students"
      );
      if (!batch) return res.status(404).json({ message: "Batch not found" });

      const assignedSyllabi = await BatchSyllabus.find({
        batch: batchId,
        syllabus: { $in: teacherSyllabusIds },
      })
        .populate("syllabus", "subject description lectures topics")
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 });

      return res.json({ batch: batch.toObject(), assignedSyllabi });
    }

    // 3. Find only batches that have syllabi assigned to this teacher
    const teacherBatchSyllabi = await BatchSyllabus.find({
      syllabus: { $in: teacherSyllabusIds },
    }).lean();

    const teacherBatchIds = [
      ...new Set(teacherBatchSyllabi.map((bs) => bs.batch.toString())),
    ];

    const batches = await Batch.find({ _id: { $in: teacherBatchIds } }).select(
      "batch_name batch_no students"
    );

    const batchesWithSyllabi = await Promise.all(
      batches.map(async (b) => {
        const assignedSyllabi = await BatchSyllabus.find({
          batch: b._id,
          syllabus: { $in: teacherSyllabusIds },
        })
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
