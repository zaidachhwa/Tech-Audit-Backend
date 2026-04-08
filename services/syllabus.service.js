import {Syllabus} from "../models/syllabus.model.js";
import {Topic} from "../models/topic.model.js";
import {BatchSyllabus} from "../models/batchSyllabus.model.js";
import {BatchTopic} from "../models/batchTopic.model.js";

// ✅ UPDATE SYLLABUS
export const updateSyllabusService = async (id, data) => {
  return await Syllabus.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  })
    .populate("topics")
    .populate("assignedTeacher", "name email phone")
    .populate("createdBy", "name email");
};

// ✅ DELETE SYLLABUS
export const deleteSyllabusService = async (id) => {
  // Cascade delete associated topics and batch assignments
  await Topic.deleteMany({ syllabus: id });
  await BatchSyllabus.deleteMany({ syllabus: id });
  await BatchTopic.deleteMany({ syllabus: id });
  
  return await Syllabus.findByIdAndDelete(id);
};

// ✅ UPDATE TOPIC
export const updateTopicService = async (id, data) => {
  return await Topic.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

// ✅ DELETE TOPIC
export const deleteTopicService = async (id) => {
  const topic = await Topic.findById(id);
  if (topic) {
    // Remove from parent Syllabus
    await Syllabus.findByIdAndUpdate(topic.syllabus, {
      $pull: { topics: topic._id }
    });
    // Delete assigned batch topics
    await BatchTopic.deleteMany({ templateTopic: id });
  }
  return await Topic.findByIdAndDelete(id);
};
