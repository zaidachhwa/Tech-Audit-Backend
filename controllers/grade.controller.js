import Grade from "../models/grade.model.js";

/* =====================================
   SAVE / UPDATE GRADES FOR A BATCH
   POST /grades/save
   Body: { batchId, gradesData: [{ student, grades: [{ assignment, score, maxScore }] }] }
===================================== */
export const saveGrades = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId, gradesData } = req.body;

    if (!batchId || !gradesData || !Array.isArray(gradesData)) {
      return res.status(400).json({ message: "batchId and gradesData are required" });
    }

    const results = await Promise.all(
      gradesData.map((entry) =>
        Grade.findOneAndUpdate(
          { batch: batchId, student: entry.student, teacher: teacherId },
          { batch: batchId, student: entry.student, teacher: teacherId, grades: entry.grades },
          { upsert: true, new: true }
        )
      )
    );

    res.json({ message: "Grades saved successfully", count: results.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================
   GET GRADES FOR A BATCH
   GET /grades?batchId=
===================================== */
export const getGrades = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.query;

    if (!batchId) {
      return res.status(400).json({ message: "batchId is required" });
    }

    const grades = await Grade.find({ batch: batchId, teacher: teacherId })
      .populate("student", "name email");

    res.json({ grades });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};