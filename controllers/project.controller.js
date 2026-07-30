// controllers/project.controller.js
import Project from "../models/project.model.js";
import Batch from "../models/batch.model.js";
import { Student } from "../models/student.model.js";
import { sendPushToBatch, sendPushToUser } from "../services/pushNotification.service.js";
import { notifyParents } from "../services/parentNotification.service.js";

/* Assign project to batch (keeps your previous behavior) */
export const assignProjectToBatch = async (req, res) => {
  try {
    const {
      batchId,
      title,
      description,
      modules = [],
      adminId,
      outcomes = [],
      skills = [],
      repo = "",
      overallStatus = "Pending",
      dueDate,
    } = req.body;

    if (!batchId || !title || !description || !adminId)
      return res.status(400).json({ message: "Required fields missing" });

    const batch = await Batch.findById(batchId).populate("students");
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const createdProjects = [];
    for (const student of batch.students) {
      const project = new Project({
        title,
        description,
        assignedTo: student._id,
        batch: batch._id,
        modules,
        createdBy: adminId,
        creatorModel: req.user?.role === 'teacher' ? 'Teacher' : 'Admin',
        outcomes,
        skills,
        repo,
        overallStatus,
        dueDate,
      });
      await project.save();
      await Student.findByIdAndUpdate(student._id, {
        $push: { projects: project._id },
      });
      createdProjects.push(project);
    }
    
    // Send Push
    await sendPushToBatch(batch.batch_name, {
      title: "New Project Assigned",
      body: `You have a new project: ${title}`,
      url: "/student/projects"
    });
    
    if (batch.students && batch.students.length > 0) {
      await notifyParents(batch.students, "New Project Assigned", `A new project has been assigned: ${title}. Due date: ${new Date(dueDate).toDateString()}`);
    }

    return res
      .status(201)
      .json({ message: "Projects assigned", projects: createdProjects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Create single project (enhanced with all fields) */
export const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      batchId,
      assignedTo,
      studentId, // Alternative to assignedTo
      modules = [],
      outcomes = [],
      skills = [],
      repo = "",
      overallStatus = "Pending",
      dueDate,
    } = req.body;

    const finalDescription = description || title;
    let targetStudent = assignedTo || studentId;

    if (!title || !batchId) {
      return res.status(400).json({ message: "Title and batchId are required" });
    }

    if (!targetStudent) {
      const batch = await Batch.findById(batchId).populate("students");
      if (!batch || !batch.students || batch.students.length === 0) {
        return res.status(400).json({ message: "No students found in batch to assign project" });
      }
      const createdProjects = [];
      for (const st of batch.students) {
        const sId = typeof st === "object" ? (st._id || st.id || st) : st;
        const project = await Project.create({
          title,
          description: finalDescription,
          batch: batchId,
          assignedTo: sId,
          modules,
          createdBy: req.user?.id || req.body.createdBy,
          creatorModel: req.user?.role === 'teacher' ? 'Teacher' : 'Admin',
          outcomes,
          skills,
          repo,
          overallStatus,
          dueDate,
        });
        await Student.findByIdAndUpdate(sId, { $push: { projects: project._id } });
        createdProjects.push(project);
      }
      
      // Send Push
      await sendPushToBatch(batch.batch_name, {
        title: "New Project Assigned",
        body: `You have a new project: ${title}`,
        url: "/student/projects"
      });
      
      if (batch.students && batch.students.length > 0) {
        await notifyParents(batch.students, "New Project Assigned", `A new project has been assigned: ${title}. Due date: ${new Date(dueDate).toDateString()}`);
      }

      return res.status(201).json({ message: "Projects created for batch", projects: createdProjects });
    }

    const finalStudentId = typeof targetStudent === "object" ? (targetStudent._id || targetStudent.id || targetStudent) : targetStudent;

    const project = await Project.create({
      title,
      description: finalDescription,
      batch: batchId,
      assignedTo: finalStudentId,
      modules,
      createdBy: req.user?.id || req.body.createdBy,
      creatorModel: req.user?.role === 'teacher' ? 'Teacher' : 'Admin',
      outcomes,
      skills,
      repo,
      overallStatus,
      dueDate,
    });

    // push to student's projects array
    await Student.findByIdAndUpdate(finalStudentId, {
      $push: { projects: project._id },
    });
    
    // Send Push
    await sendPushToUser(finalStudentId, "Student", {
       title: "New Project Assigned",
       body: `You have a new project: ${title}`,
       url: "/student/projects"
    });
    
    await notifyParents([finalStudentId], "New Project Assigned", `A new project has been assigned: ${title}. Due date: ${new Date(dueDate).toDateString()}`);

    const populatedProject = await Project.findById(project._id)
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email");

    return res.status(201).json({ message: "Project created", project: populatedProject });
  } catch (err) {
    console.error("Create project error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* Get all projects (filtered by teacher allocated batches if role === 'teacher') */
export const getAllProjects = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role === "teacher") {
      const { getTeacherAllocatedBatchIds } = await import("./batch.controller.js");
      const allocatedBatchIds = await getTeacherAllocatedBatchIds(req.user.id);
      query = {
        $or: [
          { createdBy: req.user.id },
          { batch: { $in: allocatedBatchIds } },
        ],
      };
    }

    const projects = await Project.find(query)
      .populate("assignedTo", "name email")
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ count: projects.length, projects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Get projects by batch */
export const getProjectsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const projects = await Project.find({ batch: batchId })
      .populate("assignedTo", "name email")
      .populate("createdBy", "name email")
      .lean();
    return res.status(200).json({ count: projects.length, projects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Get projects by student */
export const getProjectsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const projects = await Project.find({ assignedTo: studentId })
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email")
      .lean();
    return res.status(200).json({ count: projects.length, projects });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Get single project by ID */
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate("assignedTo createdBy batch")
      .lean();
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.status(200).json(project);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Update project */
export const updateProject = async (req, res) => {
  try {
    const update = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      update,
      { new: true }
    )
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email")
      .lean();
    if (!project) return res.status(404).json({ message: "Project not found" });
    return res.status(200).json({ message: "Project updated", project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Delete project */
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // remove reference from student's projects
    await Student.updateOne(
      { _id: project.assignedTo },
      { $pull: { projects: project._id } }
    );

    await Project.findByIdAndDelete(req.params.projectId);
    return res.status(200).json({ message: "Project deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Module status update (student) */
export const updateModuleStatus = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { status, notes } = req.body;
    const studentId = req.user.id;

    const project = await Project.findOneAndUpdate(
      { "modules._id": moduleId, assignedTo: studentId },
      { $set: { "modules.$.status": status, "modules.$.notes": notes } },
      { new: true }
    )
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email");

    if (!project)
      return res.status(404).json({ message: "Project or module not found." });

    return res.status(200).json({ message: "Module updated", project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Update project status (student) */
export const updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const studentId = req.user.id;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, assignedTo: studentId },
      { overallStatus: status },
      { new: true }
    )
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email");

    if (!project)
      return res
        .status(404)
        .json({ message: "Project not found or unauthorized" });

    return res.status(200).json({ message: "Project status updated", project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Submit project (student) */
export const submitProject = async (req, res) => {
  try {
    const studentId = req.user.id;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.projectId, assignedTo: studentId },
      { overallStatus: "Submitted" },
      { new: true }
    )
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email");

    if (!project)
      return res
        .status(404)
        .json({ message: "Project not found or unauthorized" });

    return res.status(200).json({ message: "Project submitted", project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* Approve project (admin) */
export const approveProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { overallStatus: "Approved" },
      { new: true }
    )
      .populate("batch", "batch_name batch_no")
      .populate("createdBy", "name email");

    if (!project) return res.status(404).json({ message: "Project not found" });

    return res.status(200).json({ message: "Project approved", project });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
