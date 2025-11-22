import * as reportService from "../services/report.service.js";
import Report from "../models/report.model.js";

export const createReport = async (req, res) => {
  try {
    const { studentId, parameters, feedbackSchema, overallRemarks, auditDate } =
      req.body;
    if (!studentId || !parameters?.length)
      return res
        .status(400)
        .json({ message: "studentId & parameters required" });
    const report = await reportService.createReportService({
      studentId,
      parameters,
      feedbackSchema,
      overallRemarks,
      auditDate,
    });
    return res.status(201).json({ message: "Report created", report });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 50, batch_name, batch_no, from, to } = req.query;
    const filter = {};
    if (from && to)
      filter.auditDate = { $gte: new Date(from), $lte: new Date(to) };

    // If batch filters present we filter after populate
    let query = Report.find(filter)
      .populate("student", "-password")
      .sort({ auditDate: -1 });
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Report.countDocuments(filter);
    const reports = await query.skip(skip).limit(Number(limit)).lean();
    // If batch filters provided, filter in-memory by student batch fields
    const filtered = reports.filter((r) => {
      if (!r.student) return false;
      if (batch_name && r.student.batch_name !== batch_name) return false;
      if (batch_no && Number(r.student.batch_no) !== Number(batch_no))
        return false;
      return true;
    });
    return res.status(200).json({
      total,
      page: Number(page),
      limit: Number(limit),
      count: filtered.length,
      reports: filtered,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getReportsByStudent = async (req, res) => {
  try {
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res
        .status(403)
        .json({ message: "You can only view your own reports." });
    }
    const reports = await Report.find({ student: req.params.studentId })
      .sort({ auditDate: -1 })
      .lean();
    return res.status(200).json({ count: reports.length, reports });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getBatchAverages = async (req, res) => {
  try {
    const { batch_name, batch_no, auditDate } = req.query;
    if (!batch_name || !batch_no)
      return res
        .status(400)
        .json({ message: "batch_name and batch_no required" });
    const result = await reportService.getBatchAveragesService({
      batch_name,
      batch_no,
      auditDate,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
