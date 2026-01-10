// ============================================
// controllers/syllabus.controller.js - UPDATED
// ============================================
import { Syllabus } from "../models/syllabus.model.js";
import { Topic } from "../models/topic.model.js";
import { BatchSyllabus } from "../models/batchSyllabus.model.js";
import { BatchTopic } from "../models/batchTopic.model.js";
import Batch from "../models/batch.model.js";
import { Teacher } from "../models/teacher.model.js";
import { sendWhatsAppMessage } from "../utils/whatsapp.js";
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
 * Add topic to syllabus template
 */
export const addTopic = async (req, res) => {
  try {
    const { title, description, dueDate, syllabusId } = req.body;
    if (!syllabusId)
      return res.status(400).json({ message: "syllabusId required" });

    const topic = await Topic.create({
      syllabus: syllabusId,
      title,
      description,
      dueDate,
    });

    await Syllabus.findByIdAndUpdate(syllabusId, {
      $push: { topics: topic._id },
    });

    res.status(201).json({ message: "Topic added to template", topic });
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
      .populate("topics")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ syllabi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get single syllabus template with topics
 */
export const getSyllabusById = async (req, res) => {
  try {
    const syllabus = await Syllabus.findById(req.params.syllabusId)
      .populate("topics")
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
 * Creates batch-specific copies of all topics
 */
export const assignSyllabusToBatch = async (req, res) => {
  try {
    const { syllabusId, batchId, notes, dueDate } = req.body;

    if (!syllabusId || !batchId) {
      return res.status(400).json({
        message: "syllabusId and batchId required",
      });
    }

    // Verify batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Verify syllabus exists
    const syllabus = await Syllabus.findById(syllabusId).populate("topics");
    if (!syllabus) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    // Check if already assigned
    const existing = await BatchSyllabus.findOne({
      batch: batchId,
      syllabus: syllabusId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Syllabus already assigned to this batch",
      });
    }

    // Create BatchSyllabus instance
    const batchSyllabus = await BatchSyllabus.create({
      batch: batchId,
      syllabus: syllabusId,
      assignedBy: req.user.id,
      notes: notes || "",
      dueDate: dueDate,
    });

    // Get template topics
    const templateTopics = await Topic.find({ syllabus: syllabusId });

    if (templateTopics.length === 0) {
      return res.status(400).json({
        message: "Syllabus has no topics to assign",
      });
    }

    // Create batch-specific topic copies
    const batchTopicDocs = templateTopics.map((topic) => ({
      batch: batchId,
      syllabus: syllabusId,
      templateTopic: topic._id,
      title: topic.title,
      description: topic.description,
      dueDate: topic.dueDate,
      completionStatus: "Pending",
      // assignedTo will be set later by admin
    }));

    const createdBatchTopics = await BatchTopic.insertMany(batchTopicDocs);

    res.status(201).json({
      message: "Syllabus assigned to batch successfully",
      batchSyllabus,
      topicsCreated: createdBatchTopics.length,
      topics: createdBatchTopics,
    });
  } catch (err) {
    console.error("Error assigning syllabus to batch:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Assign teacher to a specific batch topic
 */
export const assignTeacherToBatchTopic = async (req, res) => {
  try {
    const { batchTopicId, teacherId } = req.body;

    if (!batchTopicId || !teacherId) {
      return res.status(400).json({
        message: "batchTopicId and teacherId required",
      });
    }

    // Verify teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Update batch topic
    const batchTopic = await BatchTopic.findByIdAndUpdate(
      batchTopicId,
      { assignedTo: teacherId },
      { new: true }
    )
      .populate("assignedTo", "name email phone")
      .populate("templateTopic", "title")
      .populate("batch", "batch_name batch_no");

    if (!batchTopic) {
      return res.status(404).json({ message: "Batch topic not found" });
    }

    // ⭐⭐⭐ SEND WHATSAPP MESSAGE ⭐⭐⭐
    if (teacher.phone) {
      const msg = `📘 *New Topic Assigned*\n\nHello *${
        teacher.name
      }*,\nYou have been assigned a new topic:\n\n*${
        batchTopic.title || batchTopic.templateTopic?.title
      }*\nBatch: ${
        batchTopic.batch?.batch_name || ""
      }\n\nPlease check your portal for details.`;

      await sendWhatsAppMessage(teacher.phone, msg);
    } else {
      console.log("⚠ Teacher has no phone number, WhatsApp not sent.");
    }

    res.json({
      message: "Teacher assigned to topic successfully",
      topic: batchTopic,
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
 * Get batch topics for a specific batch and syllabus
 */
export const getBatchTopics = async (req, res) => {
  try {
    const { batchId, syllabusId } = req.query;

    if (!batchId || !syllabusId) {
      return res.status(400).json({
        message: "batchId and syllabusId required",
      });
    }

    const topics = await BatchTopic.find({
      batch: batchId,
      syllabus: syllabusId,
    })
      .populate("assignedTo", "name email")
      .populate("templateTopic", "title description")
      .sort({ dueDate: 1 });

    const counts = {
      total: topics.length,
      completed: topics.filter((t) => t.completionStatus === "Completed")
        .length,
      inProgress: topics.filter((t) => t.completionStatus === "In Progress")
        .length,
      pending: topics.filter((t) => t.completionStatus === "Pending").length,
    };

    res.json({ topics, counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get syllabus progress for a specific batch
 */
export const getSyllabusWithProgress = async (req, res) => {
  try {
    const { syllabusId } = req.params;
    const { batchId } = req.query;

    if (batchId) {
      // Return batch-specific progress
      const batchTopics = await BatchTopic.find({
        syllabus: syllabusId,
        batch: batchId,
      })
        .populate("assignedTo", "name email")
        .populate("templateTopic", "title")
        .sort({ dueDate: 1 });

      const counts = {
        total: batchTopics.length,
        completed: batchTopics.filter((t) => t.completionStatus === "Completed")
          .length,
        inProgress: batchTopics.filter(
          (t) => t.completionStatus === "In Progress"
        ).length,
        pending: batchTopics.filter((t) => t.completionStatus === "Pending")
          .length,
      };

      res.json({
        batchId,
        syllabusId,
        counts,
        topics: batchTopics,
      });
    } else {
      // Return template info
      const syllabus = await Syllabus.findById(syllabusId)
        .populate("topics")
        .populate("createdBy", "name email");

      if (!syllabus) {
        return res.status(404).json({ message: "Syllabus not found" });
      }

      res.json({ syllabus });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * TEACHER - TOPIC MANAGEMENT
 * ============================================
 */

/**
 * Get topics assigned to logged-in teacher (batch-scoped)
 */
export const getTeacherTopics = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.query;

    const filter = { assignedTo: teacherId };
    if (batchId) filter.batch = batchId;

    const topics = await BatchTopic.find(filter)
      .populate("syllabus", "subject description")
      .populate("batch", "batch_name batch_no")
      .populate("templateTopic", "title")
      .sort({ dueDate: 1 });

    res.json({ topics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Mark batch topic as completed
 */
export const markTopicCompleted = async (req, res) => {
  try {
    const { topicId } = req.params;

    const batchTopic = await BatchTopic.findById(topicId)
      .populate("syllabus", "subject")
      .populate("batch", "batch_name batch_no");

    if (!batchTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Permission check
    if (
      req.user.role === "teacher" &&
      String(batchTopic.assignedTo) !== String(req.user.id)
    ) {
      return res.status(403).json({
        message: "Not authorized to update this topic",
      });
    }

    batchTopic.completionStatus = "Completed";
    batchTopic.completedAt = new Date();
    await batchTopic.save();

    res.json({
      message: "Topic marked as completed",
      topic: batchTopic,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Update batch topic status (can set to any status)
 */
export const updateTopicStatus = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "In Progress", "Completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const batchTopic = await BatchTopic.findById(topicId);
    if (!batchTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Permission check
    if (
      req.user.role === "teacher" &&
      String(batchTopic.assignedTo) !== String(req.user.id)
    ) {
      return res.status(403).json({
        message: "Not authorized to update this topic",
      });
    }

    batchTopic.completionStatus = status;
    if (status === "Completed") {
      batchTopic.completedAt = new Date();
    }
    await batchTopic.save();

    res.json({
      message: "Topic status updated",
      topic: batchTopic,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Add remark to batch topic
 */
export const addTopicRemark = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { remark } = req.body;

    const batchTopic = await BatchTopic.findById(topicId)
      .populate("syllabus", "subject")
      .populate("batch", "batch_name batch_no");

    if (!batchTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Permission check
    if (
      req.user.role === "teacher" &&
      String(batchTopic.assignedTo) !== String(req.user.id)
    ) {
      return res.status(403).json({
        message: "Not authorized to update this topic",
      });
    }

    batchTopic.remarks = remark || "";
    await batchTopic.save();

    res.json({
      message: "Remark saved successfully",
      topic: batchTopic,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ============================================
 * UTILITY FUNCTIONS
 * ============================================
 */

/**
 * Delete batch syllabus assignment (and all its topics)
 */
export const deleteBatchSyllabus = async (req, res) => {
  try {
    const { batchSyllabusId } = req.params;

    const batchSyllabus = await BatchSyllabus.findById(batchSyllabusId);
    if (!batchSyllabus) {
      return res.status(404).json({ message: "Batch syllabus not found" });
    }

    // Delete all batch topics associated with this assignment
    await BatchTopic.deleteMany({
      batch: batchSyllabus.batch,
      syllabus: batchSyllabus.syllabus,
    });

    // Delete the batch syllabus instance
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

// Return batches and assigned syllabi visible to an authenticated user (teacher or admin).
// Query: none -> returns all batches with assignedSyllabi populated but only safe fields.
// Optionally: ?batchId=... to return assignedSyllabi for a single batch.
export const getAssignedSyllabiForTeacher = async (req, res) => {
  try {
    const { batchId } = req.query;

    // If a specific batch requested, fetch only that one
    if (batchId) {
      const batch = await Batch.findById(batchId).select(
        "batch_name batch_no students"
      );
      if (!batch) return res.status(404).json({ message: "Batch not found" });

      const assignedSyllabi = await BatchSyllabus.find({ batch: batchId })
        .populate("syllabus", "subject description topics") // only required fields
        .populate("assignedBy", "name email")
        .sort({ createdAt: -1 });

      return res.json({ batch: batch.toObject(), assignedSyllabi });
    }

    // Otherwise return all batches with assignedSyllabi arrays
    const batches = await Batch.find().select("batch_name batch_no students");

    const batchesWithSyllabi = await Promise.all(
      batches.map(async (b) => {
        const assignedSyllabi = await BatchSyllabus.find({ batch: b._id })
          .populate("syllabus", "subject description topics")
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
// ✅ UPDATE SYLLABUS
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

// ✅ DELETE SYLLABUS
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

// ✅ UPDATE TOPIC
export const updateTopic = async (req, res) => {
  try {
    const updated = await syllabusService.updateTopicService(
      req.params.topicId,
      req.body
    );

    if (!updated) return res.status(404).json({ message: "Topic not found" });

    return res.status(200).json({
      message: "Topic updated successfully",
      updated,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ✅ DELETE TOPIC
export const deleteTopic = async (req, res) => {
  try {
    const deleted = await syllabusService.deleteTopicService(
      req.params.topicId
    );

    if (!deleted) return res.status(404).json({ message: "Topic not found" });

    return res.status(200).json({
      message: "Topic deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
