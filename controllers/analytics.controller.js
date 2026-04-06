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

    // 🔹 2. Student Performance
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

    studentPerformance = studentPerformance.map(s => ({
      ...s,
      avgScore: Number(s.avgScore.toFixed(2))
    }));

    // 🔹 3. Top + Weak Students
    const topStudents = studentPerformance.slice(0, 5);
    const weakStudents = studentPerformance.filter(s => s.avgScore < 50);

    // 🔹 4. Batch Performance
    // Students store batch info as strings (batch_name, batch_no) — NOT as an ObjectId ref.
    // We group directly from student.batch_name + student.batch_no.
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
      { $unwind: "$parameters" },
      {
        $group: {
          _id: {
            name: "$student.batch_name",
            number: "$student.batch_no"
          },
          avgScore: { $avg: "$parameters.score" }
        }
      },
      {
        $project: {
          _id: 0,
          batch: {
            $concat: [
              { $ifNull: ["$_id.name", "Unknown"] },
              " #",
              { $toString: { $ifNull: ["$_id.number", "?"] } }
            ]
          },
          avgScore: { $multiply: ["$avgScore", 10] }
        }
      },
      { $sort: { batch: 1 } }
    ]);

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