import { Syllabus } from "../models/syllabus.model.js";
import { Lecture } from "../models/lecture.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import Batch from "../models/batch.model.js";
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
        .sort({ order: 1, createdAt: 1 })
        .lean();
    } else {
      // Query template lectures
      lectures = await Lecture.find(filter)
        .populate("assignedTo", "name email phone")
        .populate("syllabus", "subject")
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
      .populate("syllabus", "subject");

    if (!lecture) {
      // Try finding batch lecture instance
      lecture = await BatchLecture.findById(id)
        .populate("assignedTo", "name email phone")
        .populate("batch", "batch_name batch_no");
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
        completionStatus: "Pending",
        subLectures: lecture.subLectures.map(sl => ({
          title: sl.title,
          duration: sl.duration,
          order: sl.order,
          completionStatus: "Pending"
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
    const { id } = req.params;
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
    const { id } = req.params;
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

    const filter = { batch: batchId, syllabus: syllabusId };

    if (req.user.role === "teacher") {
      filter.assignedTo = req.user.id;
    }

    const lectures = await BatchLecture.find(filter)
      .populate("assignedTo", "name email")
      .populate("templateLecture", "title description")
      .sort({ order: 1, createdAt: 1 });

    const counts = {
      total: lectures.length,
      completed: lectures.filter((t) => t.completionStatus === "Completed").length,
      inProgress: lectures.filter((t) => t.completionStatus === "In Progress").length,
      pending: lectures.filter((t) => t.completionStatus === "Pending").length,
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
    const { lectureId } = req.params;
    const { status, subLectures } = req.body;

    const validStatuses = ["Pending", "In Progress", "Completed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const batchLecture = await BatchLecture.findById(lectureId);
    if (!batchLecture) {
      return res.status(404).json({ message: "Lecture not found" });
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
    res.json({ message: "Lecture status updated", lecture: batchLecture, topic: batchLecture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addLectureRemark = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { remark } = req.body;

    const batchLecture = await BatchLecture.findById(lectureId);
    if (!batchLecture) {
      return res.status(404).json({ message: "Lecture not found" });
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
