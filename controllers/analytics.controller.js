import Report from "../models/report.model.js";
import Project from "../models/project.model.js";

export const getAnalytics = async (req, res) => {
  try {
    // 🔹 1. Overall Avg Score
    const avgScoreData = await Report.aggregate([
      { $unwind: "$parameters" },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$parameters.score" }
        }
      }
    ]);

    const avgScoreRaw =
      avgScoreData.length > 0 ? avgScoreData[0].avgScore : 0;

    const avgScore = Number((avgScoreRaw * 10).toFixed(2));

    // 🔹 2. Student Performance (FIRST DECLARE)
    let studentPerformance = await Report.aggregate([
      { $unwind: "$parameters" },
      {
        $group: {
          _id: "$student",
          avgScore: { $avg: "$parameters.score" }
        }
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },
      {
        $project: {
          name: "$student.name",
          avgScore: { $multiply: ["$avgScore", 10] }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    // rounding
    studentPerformance = studentPerformance.map(s => ({
      ...s,
      avgScore: Number(s.avgScore.toFixed(2))
    }));

    // 🔹 3. Top + Weak Students
    const topStudents = studentPerformance.slice(0, 5);
    const weakStudents = studentPerformance.filter(s => s.avgScore < 50);

    // 🔹 4. Batch Performance (CORRECT LOGIC WITH LOOKUP)
    let batchPerformance = await Report.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student"
        }
      },
      { $unwind: "$student" },

      {
        $lookup: {
          from: "batches",
          localField: "student.batch",   // ✅ NEW (important)
          foreignField: "_id",
          as: "batch"
        }
      },
      { $unwind: "$batch" },

      { $unwind: "$parameters" },

      {
        $group: {
          _id: {
            name: "$batch.batch_name",
            number: "$batch.batch_no"
          },
          avgScore: { $avg: "$parameters.score" }
        }
      },

      {
        $project: {
          _id: 0,
          batch: {
            $concat: [
              "$_id.name",
              " #",
              { $toString: "$_id.number" }
            ]
          },
          avgScore: { $multiply: ["$avgScore", 10] }
        }
      },

      { $sort: { avgScore: -1 } }
    ]);

    batchPerformance = batchPerformance.map(b => ({
      ...b,
      avgScore: Number(b.avgScore.toFixed(2))
    }));

    // rounding (ONLY ONCE)
    batchPerformance = batchPerformance.map(b => ({
      ...b,
      avgScore: Number(b.avgScore.toFixed(2))
    }));

    // 🔹 5. Totals
    const totalReports = await Report.countDocuments();
    const totalProjects = await Project.countDocuments();

    // 🔹 FINAL RESPONSE
    res.json({
      avgScore,
      totalReports,
      totalProjects,
      topStudents,
      weakStudents,
      batchPerformance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};