import { Syllabus } from "../models/syllabus.model.js";
import { Lecture } from "../models/lecture.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import Batch from "../models/batch.model.js";
import { Schedule } from "../models/schedule.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import Homework from "../models/homework.model.js";
import TeacherLectureMapping from "../models/teacherLectureMapping.model.js";
import { sendWhatsAppMessage } from "../utils/whatsapp.js";
import * as lectureService from "../services/lecture.service.js";

/**
 * ============================================
 * ADMIN - LECTURE MANAGEMENT
 * ============================================
 */

/**
 * Get all lectures matching filters (Postman: GET /api/lectures)
 */
export const getLectures = async (req, res) => {
  try {
    const { subjectId, batchId, teacherId, lectureType } = req.query;

    let filter = {};

    // Map query parameter fields
    if (subjectId) filter.syllabus = subjectId;
    if (teacherId) filter.assignedTo = teacherId;
    
    if (lectureType) {
      const typeCapitalized = lectureType.charAt(0).toUpperCase() + lectureType.slice(1).toLowerCase();
      filter.lectureType = typeCapitalized;
    }

    let lectures = [];

    if (batchId) {
      // Query batch-specific copies
      filter.batch = batchId;
      lectures = await BatchLecture.find(filter)
        .populate("assignedTo", "name email phone")
        .populate("templateLecture", "title description")
        .populate("referenceTo", "title duration lectureType")
        .sort({ order: 1, createdAt: 1 })
        .lean();
    } else {
      // Query template lectures
      lectures = await Lecture.find(filter)
        .populate("assignedTo", "name email phone")
        .populate("syllabus", "subject")
        .populate("referenceTo", "title duration lectureType")
        .sort({ order: 1, createdAt: 1 })
        .lean();
    }

    res.json(lectures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get lecture details by ID (Postman: GET /api/lectures/:id)
 */
export const getLectureById = async (req, res) => {
  try {
    const { id } = req.params;

    let lecture = await Lecture.findById(id)
      .populate("assignedTo", "name email phone")
      .populate("syllabus", "subject")
      .populate("referenceTo", "title duration lectureType");

    if (!lecture) {
      // Try finding batch lecture instance
      lecture = await BatchLecture.findById(id)
        .populate("assignedTo", "name email phone")
        .populate("batch", "batch_name batch_no")
        .populate("referenceTo", "title duration lectureType");
    }

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    res.json(lecture);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Create lecture (master template) & propagate to selected/active batches (Postman: POST /api/lectures)
 */
export const createLecture = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      syllabusId,
      subjectId, // alias
      chapterId,
      duration,
      lectureDuration, // alias
      lectureType = "Normal",
      batchIds = [],
      order = 0,
      referenceTo = null,
      subLectures = []
    } = req.body;

    const finalSyllabusId = subjectId || syllabusId;
    const finalDuration = lectureDuration || duration;

    if (!finalSyllabusId) {
      return res.status(400).json({ message: "subjectId is required" });
    }

    // Convert type to Capitalized case for Mongoose enum
    const finalType = lectureType.charAt(0).toUpperCase() + lectureType.slice(1).toLowerCase();

    // Create the master template lecture
    const lecture = await Lecture.create({
      syllabus: finalSyllabusId,
      title,
      description,
      chapterId,
      duration: Number(finalDuration) || 0,
      lectureType: finalType,
      batchIds,
      order: Number(order) || 0,
      referenceTo: referenceTo || null,
      subLectures: subLectures.map((sub, index) => ({
        title: sub.title,
        duration: Number(sub.duration) || 0,
        order: Number(sub.order) || index,
        completionStatus: "Pending"
      }))
    });

    // Update parent syllabus template references
    await Syllabus.findByIdAndUpdate(finalSyllabusId, {
      $push: { lectures: lecture._id, topics: lecture._id }
    });

    // Determine target batches for propagation
    let targetBatchIds = [];
    if (batchIds && batchIds.length > 0) {
      targetBatchIds = batchIds;
    } else {
      const activeBatchSyllabi = await BatchSyllabus.find({ syllabus: finalSyllabusId });
      targetBatchIds = activeBatchSyllabi.map(bs => bs.batch);
    }

    if (targetBatchIds.length > 0) {
      const batchLectureDocs = targetBatchIds.map(batchId => ({
        batch: batchId,
        syllabus: finalSyllabusId,
        templateLecture: lecture._id,
        title: lecture.title,
        description: lecture.description,
        chapterId: lecture.chapterId,
        duration: lecture.duration,
        lectureType: lecture.lectureType,
        order: lecture.order,
        completionStatus: "Yet to be scheduled",
        referenceTo: lecture.referenceTo || null,
        subLectures: lecture.subLectures.map(sl => ({
          title: sl.title,
          duration: sl.duration,
          order: sl.order,
          completionStatus: "Yet to be scheduled"
        }))
      }));
      await BatchLecture.insertMany(batchLectureDocs);
    }

    res.status(201).json({ message: "Lecture created and propagated successfully", lecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update lecture template (Postman: PUT /api/lectures/:id)
 */
export const updateLecture = async (req, res) => {
  try {
    const id = req.params.id || req.params.topicId || req.params.lectureId;
    const updated = await lectureService.updateLectureService(id, req.body);
    if (!updated) {
      return res.status(404).json({ message: "Lecture not found" });
    }
    res.json({ message: "Lecture updated successfully", lecture: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete lecture template (Postman: DELETE /api/lectures/:id)
 */
export const deleteLecture = async (req, res) => {
  try {
    const id = req.params.id || req.params.topicId || req.params.lectureId;
    const deleted = await lectureService.deleteLectureService(id);
    if (!deleted) {
      return res.status(404).json({ message: "Lecture not found" });
    }
    res.json({ message: "Lecture deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * SUB-LECTURES CRUD
 * ============================================
 */

/**
 * Add sub-lecture (Postman: POST /api/lectures/:lectureId/sub-lectures)
 */
export const addSubLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { title, duration, order } = req.body;

    const sub = {
      title,
      duration: Number(duration) || 0,
      order: Number(order) || 0,
      completionStatus: "Pending"
    };

    // Check if parent is template Lecture
    let parent = await Lecture.findById(lectureId);
    if (parent) {
      parent.subLectures.push(sub);
      await parent.save();

      // Sync sub-lecture propagation to all BatchLecture copies
      const addedSub = parent.subLectures[parent.subLectures.length - 1];
      await BatchLecture.updateMany(
        { templateLecture: lectureId },
        {
          $push: {
            subLectures: {
              _id: addedSub._id,
              title: addedSub.title,
              duration: addedSub.duration,
              order: addedSub.order,
              completionStatus: "Pending"
            }
          }
        }
      );

      return res.status(201).json({ message: "Sub-lecture added to template", lecture: parent });
    }

    // Try finding BatchLecture parent
    parent = await BatchLecture.findById(lectureId);
    if (parent) {
      parent.subLectures.push(sub);
      await parent.save();
      return res.status(201).json({ message: "Sub-lecture added to batch instance", lecture: parent });
    }

    return res.status(404).json({ message: "Lecture not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all sub-lectures for a lecture (Postman: GET /api/lectures/:lectureId/sub-lectures)
 */
export const getSubLectures = async (req, res) => {
  try {
    const { lectureId } = req.params;
    let parent = await Lecture.findById(lectureId);
    if (!parent) {
      parent = await BatchLecture.findById(lectureId);
    }

    if (!parent) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    res.json(parent.subLectures || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update sub-lecture by its ID (Postman: PUT /api/sub-lectures/:id)
 */
export const updateSubLectureById = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, duration, order, completionStatus } = req.body;

    // Search template Lectures
    let parent = await Lecture.findOne({ "subLectures._id": id });
    if (parent) {
      const sub = parent.subLectures.id(id);
      if (title) sub.title = title;
      if (duration !== undefined) sub.duration = Number(duration) || 0;
      if (order !== undefined) sub.order = Number(order) || 0;
      if (completionStatus) sub.completionStatus = completionStatus;
      await parent.save();

      // Sync updates to BatchLecture instances
      await BatchLecture.updateMany(
        { "subLectures._id": id },
        {
          $set: {
            "subLectures.$.title": sub.title,
            "subLectures.$.duration": sub.duration,
            "subLectures.$.order": sub.order,
          }
        }
      );

      return res.json({ message: "Sub-lecture updated", sub });
    }

    // Search BatchLectures
    parent = await BatchLecture.findOne({ "subLectures._id": id });
    if (parent) {
      const sub = parent.subLectures.id(id);
      if (title) sub.title = title;
      if (duration !== undefined) sub.duration = Number(duration) || 0;
      if (order !== undefined) sub.order = Number(order) || 0;
      if (completionStatus) sub.completionStatus = completionStatus;
      await parent.save();
      return res.json({ message: "Sub-lecture updated", sub });
    }

    return res.status(404).json({ message: "Sub-lecture not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Delete sub-lecture by its ID (Postman: DELETE /api/sub-lectures/:id)
 */
export const deleteSubLectureById = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from template Lecture
    let parent = await Lecture.findOne({ "subLectures._id": id });
    if (parent) {
      parent.subLectures.pull(id);
      await parent.save();

      // Sync propagation - delete from BatchLectures
      await BatchLecture.updateMany(
        { "subLectures._id": id },
        { $pull: { subLectures: { _id: id } } }
      );

      return res.json({ message: "Sub-lecture deleted from template" });
    }

    // Delete from BatchLecture
    parent = await BatchLecture.findOne({ "subLectures._id": id });
    if (parent) {
      parent.subLectures.pull(id);
      await parent.save();
      return res.json({ message: "Sub-lecture deleted from batch instance" });
    }

    return res.status(404).json({ message: "Sub-lecture not found" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * REFERENCE LECTURES
 * ============================================
 */

export const getReferenceLectures = async (req, res) => {
  try {
    const lectures = await Lecture.find({ lectureType: "Reference" })
      .populate("syllabus", "subject")
      .sort({ order: 1, createdAt: 1 });
    res.json(lectures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createReferenceLecture = async (req, res) => {
  req.body.lectureType = "Reference";
  return createLecture(req, res);
};

/**
 * ============================================
 * TEACHER MAPPING ENDPOINTS
 * ============================================
 */

export const createTeacherMapping = async (req, res) => {
  try {
    const { teacherId, lectureIds = [] } = req.body;

    if (!teacherId) {
      return res.status(400).json({ message: "teacherId is required" });
    }

    // Map to corresponding documents
    await Lecture.updateMany({ _id: { $in: lectureIds } }, { assignedTo: teacherId });
    await BatchLecture.updateMany({ _id: { $in: lectureIds } }, { assignedTo: teacherId });

    let mapping = await TeacherLectureMapping.findOne({ teacher: teacherId });
    if (mapping) {
      mapping.lectures = [...new Set([...mapping.lectures.map(id => id.toString()), ...lectureIds])];
      await mapping.save();
    } else {
      mapping = await TeacherLectureMapping.create({
        teacher: teacherId,
        lectures: lectureIds
      });
    }

    res.status(201).json({ message: "Teacher mapping updated successfully", mapping });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTeacherMappings = async (req, res) => {
  try {
    const mappings = await TeacherLectureMapping.find()
      .populate("teacher", "name email phone")
      .populate("lectures", "title duration lectureType");
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTeacherMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const { lectureIds = [] } = req.body;

    const mapping = await TeacherLectureMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    // Clear old mappings
    await Lecture.updateMany({ assignedTo: mapping.teacher }, { assignedTo: null });
    await BatchLecture.updateMany({ assignedTo: mapping.teacher }, { assignedTo: null });

    // Set new mappings
    await Lecture.updateMany({ _id: { $in: lectureIds } }, { assignedTo: mapping.teacher });
    await BatchLecture.updateMany({ _id: { $in: lectureIds } }, { assignedTo: mapping.teacher });

    mapping.lectures = lectureIds;
    await mapping.save();

    res.json({ message: "Mapping updated successfully", mapping });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTeacherMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await TeacherLectureMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    // Clear assignments from lectures
    await Lecture.updateMany({ _id: { $in: mapping.lectures } }, { assignedTo: null });
    await BatchLecture.updateMany({ templateLecture: { $in: mapping.lectures } }, { assignedTo: null });

    await TeacherLectureMapping.findByIdAndDelete(id);
    res.json({ message: "Mapping deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * TEACHER/STUDENT/ADMIN - LECTURE RETRIEVAL & TRACKING
 * ============================================
 */

export const getBatchLectures = async (req, res) => {
  try {
    const { batchId, syllabusId } = req.query;

    if (!batchId || !syllabusId) {
      return res.status(400).json({ message: "batchId and syllabusId required" });
    }

    if (req.user && req.user.role === "teacher") {
      const Teacher = (await import("../models/teacher.model.js")).Teacher;
      const { Syllabus } = await import("../models/syllabus.model.js");

      const teacher = await Teacher.findById(req.user.id).lean();
      const teacherSubjects = teacher?.subjects || [];

      const syllabusDoc = await Syllabus.findById(syllabusId).lean();
      if (syllabusDoc) {
        const isAssigned =
          syllabusDoc.assignedTeacher?.toString() === req.user.id ||
          (syllabusDoc.assignedTeachers || []).some(
            (tId) => tId.toString() === req.user.id
          ) ||
          teacherSubjects.includes(syllabusDoc.subject);

        if (!isAssigned) {
          const assignedLecture = await BatchLecture.findOne({
            batch: batchId,
            syllabus: syllabusId,
            $or: [{ assignedTo: req.user.id }, { teacherIds: req.user.id }],
          });
          if (!assignedLecture) {
            return res.status(403).json({ message: "Access denied to this syllabus" });
          }
        }
      }
    }

    const rawLectures = await BatchLecture.find({ batch: batchId, syllabus: syllabusId })
      .populate("assignedTo", "name email")
      .populate("templateLecture", "title description")
      .sort({ order: 1, createdAt: 1 });

    // Deduplicate by title to ensure only 1 card per topic is shown
    const mapByTitle = new Map();
    for (const l of rawLectures) {
      const tKey = (l.title || "").trim().toLowerCase();
      if (!mapByTitle.has(tKey)) {
        mapByTitle.set(tKey, l);
      } else {
        const existing = mapByTitle.get(tKey);
        const lIsScheduled = l.dueDate || (l.completionStatus !== "Yet to be scheduled" && l.completionStatus !== "Pending");
        const existingIsScheduled = existing.dueDate || (existing.completionStatus !== "Yet to be scheduled" && existing.completionStatus !== "Pending");
        if (lIsScheduled && !existingIsScheduled) {
          mapByTitle.set(tKey, l);
        }
      }
    }

    const lectures = Array.from(mapByTitle.values());

    const counts = {
      total: lectures.length,
      completed: lectures.filter((t) => t.completionStatus === "Completed").length,
      inProgress: lectures.filter((t) => t.completionStatus === "In Progress").length,
      pending: lectures.filter((t) => t.completionStatus === "Yet to be scheduled" || t.completionStatus === "Pending").length,
    };

    res.json({ lectures, counts, topics: lectures });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTeacherLectures = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.query;

    const filter = { assignedTo: teacherId };
    if (batchId) filter.batch = batchId;

    const lectures = await BatchLecture.find(filter)
      .populate("syllabus", "subject description")
      .populate("batch", "batch_name batch_no")
      .populate("templateLecture", "title")
      .sort({ order: 1, createdAt: 1 });

    res.json({ lectures, topics: lectures });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateLectureStatus = async (req, res) => {
  try {
    const id = req.params.topicId || req.params.lectureId || req.params.id;
    const { status, subLectures } = req.body;

    const validStatuses = ["Yet to be scheduled", "Pending", "In Progress", "Completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const batchLecture = await BatchLecture.findById(id);
    if (!batchLecture) {
      return res.status(404).json({ message: "Lecture/Topic not found" });
    }

    if (
      req.user.role === "teacher" &&
      batchLecture.assignedTo &&
      String(batchLecture.assignedTo) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not authorized to update this lecture" });
    }

    if (status) {
      batchLecture.completionStatus = status;
      if (status === "Completed") {
        batchLecture.completedAt = new Date();
      }
    }

    if (subLectures && Array.isArray(subLectures)) {
      batchLecture.subLectures = subLectures;
    }

    await batchLecture.save();
    
    // Also update the base template so admin panel sees it
    if (batchLecture.templateLecture) {
      const Lecture = (await import("../models/lecture.model.js")).Lecture;
      await Lecture.findByIdAndUpdate(batchLecture.templateLecture, {
        completionStatus: status === "Yet to be scheduled" ? "Pending" : status,
        completedAt: status === "Completed" ? new Date() : undefined
      });
    }

    res.json({ message: "Lecture status updated", lecture: batchLecture, topic: batchLecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addLectureRemark = async (req, res) => {
  try {
    const id = req.params.topicId || req.params.lectureId || req.params.id;
    const { remark } = req.body;

    const batchLecture = await BatchLecture.findById(id);
    if (!batchLecture) {
      return res.status(404).json({ message: "Lecture/Topic not found" });
    }

    if (
      req.user.role === "teacher" &&
      batchLecture.assignedTo &&
      String(batchLecture.assignedTo) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Not authorized to update this lecture" });
    }

    batchLecture.remarks = remark || "";
    await batchLecture.save();

    res.json({ message: "Remark saved successfully", lecture: batchLecture, topic: batchLecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * SUBJECT PROGRESS CALCULATION
 * ============================================
 */

export const getSubjectProgress = async (req, res) => {
  try {
    let { batchId } = req.query;

    if (!batchId && req.user.role === "student") {
      const studentBatch = await Batch.findOne({ students: req.user.id });
      if (!studentBatch) {
        return res.status(404).json({ message: "No batch assigned to this student." });
      }
      batchId = studentBatch._id;
    }

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    const assignedSyllabi = (await BatchSyllabus.find({ batch: batchId }).populate("syllabus")).filter(bs => bs.syllabus);

    const subjectProgress = await Promise.all(
      assignedSyllabi.map(async (bs) => {
        const syllabusId = bs.syllabus._id;
        const subjectName = bs.syllabus.subject;

        const filter = {
          batch: batchId,
          syllabus: syllabusId,
          lectureType: "Normal"
        };

        if (req.user.role === "teacher") {
          filter.assignedTo = req.user.id;
        }

        const lectures = await BatchLecture.find(filter);
        const total = lectures.length;
        const completed = lectures.filter(l => l.completionStatus === "Completed").length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          syllabusId,
          subject: subjectName,
          totalLectures: total,
          completedLectures: completed,
          progressPercentage: percentage
        };
      })
    );

    res.json({ batchId, subjectProgress });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get subject-wise progress formatted (Postman: GET /api/progress/subject)
 */
export const getSubjectProgressFormatted = async (req, res) => {
  try {
    let { batchId } = req.query;

    if (!batchId && req.user.role === "student") {
      const studentBatch = await Batch.findOne({ students: req.user.id });
      if (studentBatch) batchId = studentBatch._id;
    }

    // Default to first batch if admin/teacher calls without batchId
    if (!batchId) {
      const firstBatch = await Batch.findOne();
      if (firstBatch) batchId = firstBatch._id;
    }

    if (!batchId) {
      return res.status(404).json({ message: "No batches found." });
    }

    const assignedSyllabi = (await BatchSyllabus.find({ batch: batchId }).populate("syllabus")).filter(bs => bs.syllabus);

    const formattedProgress = await Promise.all(
      assignedSyllabi.map(async (bs) => {
        const syllabusId = bs.syllabus._id;
        const subjectName = bs.syllabus.subject;

        const lectures = await BatchLecture.find({
          batch: batchId,
          syllabus: syllabusId,
          lectureType: "Normal"
        });

        const total = lectures.length;
        const completed = lectures.filter(l => l.completionStatus === "Completed").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          subject: subjectName,
          totalLectures: total,
          completedLectures: completed,
          progress
        };
      })
    );

    res.json(formattedProgress);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * ADMIN/TEACHER DASHBOARD STATISTICS
 * ============================================
 */

/**
 * Get Admin dashboard stats (Postman: GET /api/admin/dashboard)
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    const totalSubjects = await Syllabus.countDocuments();
    const totalLectures = await Lecture.countDocuments({ lectureType: "Normal" });
    const referenceLectures = await Lecture.countDocuments({ lectureType: "Reference" });
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await Student.countDocuments();
    const pendingHomework = await Homework.countDocuments({ status: "Pending Approval" });

    res.json({
      totalSubjects,
      totalLectures,
      referenceLectures,
      totalTeachers,
      totalStudents,
      pendingHomework
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * MASTER DATA APIS
 * ============================================
 */

export const getLectureTypes = async (req, res) => {
  res.json(["normal", "reference"]);
};

export const getHomeworkStatuses = async (req, res) => {
  res.json(["assigned", "submitted", "pending_approval", "approved", "rejected"]);
};

export const assignTeacherToBatchLecture = async (req, res) => {
  try {
    const { batchLectureId, teacherId } = req.body;

    if (!batchLectureId || !teacherId) {
      return res.status(400).json({ message: "batchLectureId and teacherId required" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const batchLecture = await BatchLecture.findByIdAndUpdate(
      batchLectureId,
      { assignedTo: teacherId },
      { new: true }
    )
      .populate("assignedTo", "name email phone")
      .populate("templateLecture", "title")
      .populate("batch", "batch_name batch_no");

    if (!batchLecture) {
      return res.status(404).json({ message: "Batch lecture not found" });
    }

    // Send WhatsApp notification
    if (teacher.phone) {
      const msg = `📘 *New Lecture Assigned*\n\nHello *${teacher.name}*,\nYou have been assigned a new lecture:\n\n*${batchLecture.title}*\nBatch: ${batchLecture.batch?.batch_name || ""}\n\nPlease check your portal for details.`;
      await sendWhatsAppMessage(teacher.phone, msg);
    }

    res.json({ message: "Teacher assigned to lecture successfully", lecture: batchLecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const scheduleLecture = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { batchId, teacherId, dueDate } = req.body;

    if (!batchId || !teacherId || !dueDate) {
      return res.status(400).json({ message: "batchId, teacherId, and dueDate are required" });
    }

    // Try finding topic in Lecture template or BatchLecture instance
    let templateLecture = await Lecture.findById(topicId);
    let existingBatchLecture = await BatchLecture.findById(topicId);

    let syllabusId = templateLecture ? templateLecture.syllabus : (existingBatchLecture ? existingBatchLecture.syllabus : null);
    let title = templateLecture ? templateLecture.title : (existingBatchLecture ? existingBatchLecture.title : "");

    // Find if a BatchLecture copy already exists for this batch
    let batchLecture = existingBatchLecture || await BatchLecture.findOne({
      $or: [
        { batch: batchId, templateLecture: topicId },
        ...(syllabusId && title ? [{ batch: batchId, syllabus: syllabusId, title: title }] : [])
      ]
    });

    if (!batchLecture && !templateLecture) {
      return res.status(404).json({ message: "Lecture/Topic not found" });
    }

    if (batchLecture) {
      batchLecture.assignedTo = teacherId;
      batchLecture.dueDate = new Date(dueDate);
      if (batchLecture.completionStatus !== "Completed") {
        batchLecture.completionStatus = "In Progress";
      }
      await batchLecture.save();

      // Clean up any un-scheduled duplicate BatchLectures for this batch & title
      if (batchLecture.syllabus && batchLecture.title) {
        await BatchLecture.deleteMany({
          _id: { $ne: batchLecture._id },
          batch: batchId,
          syllabus: batchLecture.syllabus,
          title: batchLecture.title,
          dueDate: null
        });
      }
    } else {
      // Create a new BatchLecture copy
      batchLecture = await BatchLecture.create({
        batch: batchId,
        syllabus: templateLecture.syllabus,
        templateLecture: topicId,
        title: templateLecture.title,
        description: templateLecture.description,
        chapterId: templateLecture.chapterId,
        duration: templateLecture.duration,
        lectureType: templateLecture.lectureType,
        order: templateLecture.order,
        assignedTo: teacherId,
        dueDate: new Date(dueDate),
        completionStatus: "In Progress",
        subLectures: (templateLecture.subLectures || []).map(sl => ({
          title: sl.title,
          duration: sl.duration,
          order: sl.order,
          completionStatus: "Yet to be scheduled"
        }))
      });
    }

    if (templateLecture) {
      templateLecture.dueDate = new Date(dueDate);
      templateLecture.assignedTo = teacherId;
      await templateLecture.save();
    }

    // 🔗 Sync with Lecture Scheduler (Schedule model)
    try {
      const syllabusDoc = await Syllabus.findById(templateLecture.syllabus);
      if (syllabusDoc) {
        // 1. Remove this lecture title from any other Schedule for this batch to prevent duplicates/reschedules
        await Schedule.updateMany(
          { batch: batchId, "lectures.title": templateLecture.title },
          { $pull: { lectures: { title: templateLecture.title } } }
        );

        // 2. Find or create the target schedule
        let schedule = await Schedule.findOne({
          subject: syllabusDoc.subject,
          batch: batchId,
          teacher: teacherId
        });

        if (!schedule) {
          schedule = await Schedule.create({
            subject: syllabusDoc.subject,
            batch: batchId,
            teacher: teacherId,
            lectures: []
          });
        }

        // 3. Add the scheduled lecture to this schedule
        schedule.lectures.push({
          title: templateLecture.title,
          description: templateLecture.description,
          date: new Date(dueDate),
          status: "Scheduled",
          teacher: teacherId
        });
        await schedule.save();
      }
    } catch (syncErr) {
      console.error("Failed to sync scheduled lecture to Lecture Scheduler:", syncErr);
    }

    res.json({
      message: "Lecture scheduled successfully",
      lecture: batchLecture,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get topics for a specific batch and subject name
 */
export const getBatchSubjectTopics = async (req, res) => {
  try {
    const { batchId, subject } = req.query;

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    // Find all topics (BatchLecture) for this batch
    const allBatchTopics = await BatchLecture.find({ batch: batchId })
      .populate("assignedTo", "name email")
      .populate("templateLecture", "title description")
      .populate("syllabus", "subject name")
      .sort({ order: 1, createdAt: 1 })
      .lean();

    if (!allBatchTopics || allBatchTopics.length === 0) {
      return res.status(404).json({ message: "No syllabus topics configured for this batch" });
    }

    let topics = allBatchTopics;

    // Robust matching for subject if provided
    if (subject) {
      const subjLower = subject.toLowerCase().trim();
      topics = allBatchTopics.filter(t => {
        if (!t.syllabus) return false;
        const sName = (t.syllabus.subject || "").toLowerCase().trim();
        const nName = (t.syllabus.name || "").toLowerCase().trim();
        return sName === subjLower || nName === subjLower || sName.includes(subjLower) || subjLower.includes(sName);
      });
    }

    res.json({ topics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
