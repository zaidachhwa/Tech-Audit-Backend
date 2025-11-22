import Report from "../models/report.model.js";
import { Student } from "../models/student.model.js";
import mongoose from "mongoose";

/**
 * Create report and optionally push to student's reports[].
 */
export const createReportService = async ({
  studentId,
  parameters,
  feedbackSchema,
  overallRemarks,
  auditDate,
}) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error("Student not found");

  const report = await Report.create({
    student: studentId,
    parameters,
    feedbackSchema,
    overallRemarks,
    auditDate: auditDate ? new Date(auditDate) : new Date(),
  });

  student.reports.push(report._id);
  await student.save();

  // return created report (populated)
  return Report.findById(report._id).populate("student").lean();
};

/**
 * Get batch averages.
 * If auditDate provided, compute averages for that date range day.
 * If not provided, compute averages across the latest report per student (most recent).
 */
export const getBatchAveragesService = async ({
  batch_name,
  batch_no,
  auditDate,
}) => {
  // If auditDate provided -> narrow date range for that day
  if (auditDate) {
    const start = new Date(auditDate + "T00:00:00.000Z");
    const end = new Date(auditDate + "T23:59:59.999Z");

    const pipeline = [
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $match: {
          "student.batch_name": batch_name,
          "student.batch_no": Number(batch_no),
          auditDate: { $gte: start, $lte: end },
        },
      },
      { $unwind: "$parameters" },
      {
        $group: {
          _id: "$parameters.name",
          avg_score: { $avg: "$parameters.score" },
          scores: {
            $push: { student: "$student.name", score: "$parameters.score" },
          },
        },
      },
      {
        $project: {
          parameter: "$_id",
          avg_score: { $round: ["$avg_score", 2] },
          scores: 1,
          _id: 0,
        },
      },
    ];

    const results = await Report.aggregate(pipeline);
    return { source: "date", auditDate, averages: results };
  }

  // ELSE: pick latest report per student then average parameters across those latest reports
  // Steps:
  // 1. lookup students, match batch
  // 2. sort by auditDate desc
  // 3. group by student._id taking first (latest) report per student
  // 4. unwind parameters and group by parameter name to avg
  const pipelineLatest = [
    {
      $lookup: {
        from: "students",
        localField: "student",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: "$student" },
    {
      $match: {
        "student.batch_name": batch_name,
        "student.batch_no": Number(batch_no),
      },
    },
    { $sort: { auditDate: -1 } }, // latest first
    {
      $group: {
        _id: "$student._id",
        latestReport: { $first: "$$ROOT" }, // pick the first (latest) report per student
      },
    },
    { $replaceRoot: { newRoot: "$latestReport" } },
    { $unwind: "$parameters" },
    {
      $group: {
        _id: "$parameters.name",
        avg_score: { $avg: "$parameters.score" },
        scores: {
          $push: { student: "$student.name", score: "$parameters.score" },
        },
      },
    },
    {
      $project: {
        parameter: "$_id",
        avg_score: { $round: ["$avg_score", 2] },
        scores: 1,
        _id: 0,
      },
    },
  ];

  const results = await Report.aggregate(pipelineLatest);
  return { source: "latest", auditDate: null, averages: results };
};
