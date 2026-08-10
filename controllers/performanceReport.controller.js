import PerformanceReport from "../models/performanceReport.model.js";
import StudentAttendance from "../models/studentAttendance.model.js";
import Report from "../models/report.model.js";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import axios from "axios";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 1. Generate Report Data (No AI yet, just stats)
export const generatePerformanceReport = async (req, res) => {
  try {
    const { studentId, batchId, startDate, endDate } = req.body;
    
    if (!studentId || !batchId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end to end of day
    end.setHours(23, 59, 59, 999);

    // Fetch Attendance
    const attendanceRecords = await StudentAttendance.find({
      student: studentId,
      date: { $gte: start, $lte: end },
    }).lean();

    let workingDays = attendanceRecords.length;
    let present = 0;
    let absent = 0;
    let late = 0;

    attendanceRecords.forEach(record => {
      // Logic from existing attendance might just use PUNCHED_IN/PUNCHED_OUT
      if (record.status === "PUNCHED_IN" || record.status === "PUNCHED_OUT") {
        present++;
      } else {
        absent++;
      }
    });

    const percentage = workingDays > 0 ? ((present / workingDays) * 100).toFixed(2) : 0;
    
    const attendanceData = {
      workingDays,
      present,
      absent,
      late,
      percentage: parseFloat(percentage)
    };

    // Fetch Audits
    const reports = await Report.find({
      student: studentId,
      auditDate: { $gte: start, $lte: end },
    }).lean();

    let highestScore = 0;
    let lowestScore = 10;
    let totalScore = 0;
    let totalParameters = 0;
    
    const auditData = reports.map(r => {
      let rTotal = 0;
      let rCount = 0;
      r.parameters.forEach(p => {
        rTotal += p.score;
        rCount++;
        if (p.score > highestScore) highestScore = p.score;
        if (p.score < lowestScore) lowestScore = p.score;
      });
      
      const rAvg = rCount > 0 ? rTotal / rCount : 0;
      totalScore += rAvg;
      totalParameters++;
      
      return {
        reportId: r._id,
        auditDate: r.auditDate,
        averageScore: parseFloat(rAvg.toFixed(2)),
        overallRemarks: r.overallRemarks || ""
      };
    });

    if (totalParameters === 0) lowestScore = 0;
    
    const averageScore = totalParameters > 0 ? (totalScore / totalParameters).toFixed(2) : 0;
    
    let overallGrade = "C";
    const avgScoreNum = parseFloat(averageScore);
    if (avgScoreNum >= 9) overallGrade = "A+";
    else if (avgScoreNum >= 8) overallGrade = "A";
    else if (avgScoreNum >= 7) overallGrade = "B+";
    else if (avgScoreNum >= 6) overallGrade = "B";

    const statistics = {
      highestScore,
      lowestScore,
      averageScore: avgScoreNum,
      overallGrade
    };

    const performanceReport = await PerformanceReport.create({
      student: studentId,
      batch: batchId,
      startDate: start,
      endDate: end,
      attendanceData,
      auditData,
      statistics
    });

    const populated = await PerformanceReport.findById(performanceReport._id)
      .populate("student")
      .populate("batch")
      .lean();
      
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const generateAISummary = async (req, res) => {
  try {
    const { reportId } = req.body;
    const report = await PerformanceReport.findById(reportId).populate("student");
    if (!report) return res.status(404).json({ message: "Report not found" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ message: "GEMINI_API_KEY is missing." });
    }

    const prompt = `
      You are an expert teacher. Generate a performance summary for the student.
      Student Name: ${report.student.name}
      Duration: ${new Date(report.startDate).toLocaleDateString()} to ${new Date(report.endDate).toLocaleDateString()}
      
      Attendance: ${report.attendanceData.percentage}% (${report.attendanceData.present} present, ${report.attendanceData.absent} absent).
      Audits: ${report.auditData.length} audits taken.
      Average Score: ${report.statistics.averageScore}/10
      Overall Grade: ${report.statistics.overallGrade}
      Highest Score: ${report.statistics.highestScore}
      Lowest Score: ${report.statistics.lowestScore}
      
      Provide a highly professional JSON output with the following keys EXACTLY:
      "strengths": string,
      "weaknesses": string,
      "areasOfImprovement": string,
      "teacherRecommendation": string,
      "learningProgress": string,
      "attendanceImpact": string,
      "futureRecommendation": string
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini output:", text);
      aiResponse = {
        strengths: "Consistent performance.",
        weaknesses: "Needs more focus.",
        areasOfImprovement: "Practical implementation.",
        teacherRecommendation: "Keep practicing.",
        learningProgress: "Steady.",
        attendanceImpact: "Good attendance helps.",
        futureRecommendation: "Participate more."
      };
    }

    report.aiSummary = aiResponse;
    await report.save();

    res.json(report.aiSummary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const history = await PerformanceReport.find({ student: studentId })
      .populate("batch")
      .populate("student")
      .sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const downloadPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await PerformanceReport.findById(id).populate("student").populate("batch");
    
    if (!report) return res.status(404).json({ message: "Report not found" });

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=performance-report-${report.student.name.replace(/\s+/g, "_")}.pdf`
    );

    doc.pipe(res);

    const headerImg = path.join(process.cwd(), "public", "newHeader.jpeg");
    const footerImg = path.join(process.cwd(), "public", "newFooter.jpeg");
    const PAGE_BOTTOM = 670;
    const FOOTER_HEIGHT = 100;

    // ---------- Helpers ----------
    const drawHeader = () => {
      try { doc.image(headerImg, 0, 0, { width: 595 }); } catch (e) { console.error("Header Error:", e.message); }
      doc.moveDown(1);
    };

    const drawFooter = () => {
      const footerWidth = 600;
      const footerY = doc.page.height - FOOTER_HEIGHT;
      const footerX = doc.page.width - footerWidth;

      try {
        doc.image(footerImg, footerX, footerY, {
          width: footerWidth,
          height: FOOTER_HEIGHT,
        });
      } catch (e) { console.error("Footer Error:", e.message); }
    };

    const ensureSpace = (space = 60) => {
      if (doc.y + space > PAGE_BOTTOM) {
        drawFooter();
        doc.addPage();
        drawHeader();
        doc.moveDown(5);
      }
    };

    doc.on("pageAdded", () => {
      drawHeader();
    });

    // ---------- First Page ----------
    drawHeader();

    // ---------- Student Info (Left) and Batch Info (Right) ----------
    const startY = doc.y + 70;

    const studentName = report.student?.name || "Student Name Missing";
    const studentEmail = report.student?.email || "";
    const batchName = report.batch?.batch_name || "N/A";
    const batchNo = report.batch?.batch_no || "N/A";

    doc
      .fontSize(14)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text(studentName, 50, startY + 20);

    doc
      .fontSize(10)
      .fillColor("#666")
      .font("Helvetica")
      .text(studentEmail, 50, doc.y + 2);

    const pageWidth = doc.page.width;
    const rightMargin = 40;
    const lineGap = 14;
    const columnWidth = 160;
    const xRight = pageWidth - rightMargin;

    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`Batch : ${batchName}`, xRight - columnWidth, startY, {
        width: columnWidth,
        align: "right",
      })
      .text(`Batch No : ${batchNo}`, xRight - columnWidth, startY + lineGap, {
        width: columnWidth,
        align: "right",
      })
      .text(
        `Duration : ${new Date(report.startDate).toLocaleDateString()} to ${new Date(report.endDate).toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 2,
        {
          width: columnWidth,
          align: "right",
        }
      )
      .text(
        `Generated : ${new Date(report.createdAt).toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 3,
        {
          width: columnWidth,
          align: "right",
        }
      );

    doc.moveDown(3);

    // Helper for Card Layout
    const drawCard = (title, contentLines) => {
      ensureSpace(120);

      doc
        .fontSize(12)
        .fillColor("#000")
        .font("Helvetica-Bold")
        .text(title, 50);

      doc.moveDown(0.6);

      const leftX = 50;
      const boxWidth = doc.page.width - leftX - rightMargin;
      const padding = 12;
      const minHeight = 40;
      const radius = 6;

      doc.fontSize(10).font("Helvetica");
      
      const textHeight = contentLines.reduce((acc, line) => acc + doc.heightOfString(line.text || line, { width: boxWidth - padding * 2 }) + 8, 0);

      const boxHeight = Math.max(minHeight, textHeight + padding * 2);
      ensureSpace(boxHeight + 10);

      const y = doc.y;

      doc
        .roundedRect(leftX, y, boxWidth, boxHeight, radius)
        .lineWidth(1)
        .strokeColor("#E5E7EB")
        .stroke();

      let currentY = y + padding;
      contentLines.forEach(line => {
        doc.fillColor("#000").text(line.text || line, leftX + padding, currentY, {
          width: boxWidth - padding * 2,
          align: "left",
        });
        currentY += doc.heightOfString(line.text || line, { width: boxWidth - padding * 2 }) + 8;
      });

      doc.y = y + boxHeight + 12;
    };

    // ---------- Attendance Summary ----------
    drawCard("Attendance Summary", [
      `Total Working Days: ${report.attendanceData.workingDays}`,
      `Present: ${report.attendanceData.present}`,
      `Absent: ${report.attendanceData.absent}`,
      `Attendance Percentage: ${report.attendanceData.percentage}%`
    ]);

    // ---------- Performance Statistics ----------
    drawCard("Performance Statistics", [
      `Total Audits Taken: ${report.auditData.length}`,
      `Average Score: ${report.statistics.averageScore}/10`,
      `Highest Score: ${report.statistics.highestScore}`,
      `Lowest Score: ${report.statistics.lowestScore}`,
      `Overall Grade: ${report.statistics.overallGrade}`
    ]);

    // ---------- AI Performance Summary ----------
    if (report.aiSummary && report.aiSummary.strengths) {
      const summary = report.aiSummary;
      const aiLines = [];
      if (summary.strengths) aiLines.push(`Strengths: ${summary.strengths}`);
      if (summary.weaknesses) aiLines.push(`Weaknesses: ${summary.weaknesses}`);
      if (summary.areasOfImprovement) aiLines.push(`Areas of Improvement: ${summary.areasOfImprovement}`);
      if (summary.teacherRecommendation) aiLines.push(`Recommendation: ${summary.teacherRecommendation}`);
      if (summary.learningProgress) aiLines.push(`Learning Progress: ${summary.learningProgress}`);
      if (summary.futureRecommendation) aiLines.push(`Future Recommendation: ${summary.futureRecommendation}`);
      
      drawCard("AI Performance Summary", aiLines);
    }

    // ---------- Signatures ----------
    if (doc.y + 130 > doc.page.height - FOOTER_HEIGHT) {
      drawFooter();
      doc.addPage();
      drawHeader();
      doc.moveDown(2);
    }
    const sigY = doc.y + 115;

    const authSignImg = path.join(process.cwd(), "public", "Sign.png");
    const authStampImg = path.join(process.cwd(), "public", "Stamp.png");

    if (fs.existsSync(authSignImg)) {
      try { doc.image(authSignImg, 60, sigY - 95, { height: 85 }); } catch (e) { console.error("Auth Sign Error:", e.message); }
    }
    doc.moveTo(50, sigY).lineTo(190, sigY).stroke();
    doc.fontSize(9).fillColor("#666").font("Helvetica").text("Authorized Signatory", 50, sigY + 8, { width: 140, align: "center" });

    if (fs.existsSync(authStampImg)) {
      try { doc.image(authStampImg, 240, sigY - 110, { height: 100 }); } catch (e) { console.error("Auth Stamp Error:", e.message); }
    }
    doc.moveTo(230, sigY).lineTo(370, sigY).stroke();
    doc.fontSize(9).fillColor("#666").font("Helvetica").text("Authorized Stamp", 230, sigY + 8, { width: 140, align: "center" });

    doc.moveTo(410, sigY).lineTo(550, sigY).stroke();
    doc.fontSize(9).fillColor("#666").font("Helvetica").text("Parents Signature", 410, sigY + 8, { width: 140, align: "center" });

    // ---------- Footer ----------
    drawFooter();
    doc.end();

  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ message: "PDF generation failed" });
  }
};
