import {Syllabus} from "../models/syllabus.model.js";
import {Topic} from "../models/topic.model.js";

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
  return await Topic.findByIdAndDelete(id);
};
