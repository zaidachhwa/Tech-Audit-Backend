import path from "path";
import PDFDocument from "pdfkit";
import * as reportService from "../services/report.service.js";
import Report from "../models/report.model.js";
import Student from "../models/student.model.js";
import axios from "axios";
import fs from "fs";

export const generateFeedback = async (req, res) => {
  try {
    const { parameters } = req.body;
    if (!parameters || parameters.length === 0) {
      return res.status(400).json({ message: "Parameters required for generating feedback." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured in the backend." });
    }

    let prompt = "Analyze the student's performance based on the following parameters and scores:\n";
    parameters.forEach(p => {
      prompt += `- ${p.name}: ${p.score}/${p.totalScore || 10}\n`;
    });
    prompt += "\nRespond ONLY with a valid JSON object matching this schema:\n";
    prompt += `{\n  "points": ["string", "string", "string"],\n  "overallRemarks": "string"\n}\n`;
    prompt += "The 'points' array MUST contain exactly 3 concise, constructive feedback sentences. The 'overallRemarks' MUST contain a 2-3 sentence overall summary of the student's performance.";

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);
    
    let points = Array.isArray(parsed.points) ? parsed.points : [];
    while (points.length < 3) points.push("");
    points = points.slice(0, 3);

    return res.status(200).json({ feedback: points, overallRemarks: parsed.overallRemarks || "" });
  } catch (err) {
    console.error("Gemini API Error:", err.response?.data || err.message);
    return res.status(500).json({ message: "Failed to generate feedback via AI." });
  }
};

export const createReport = async (req, res) => {
  try {
    const { studentId, parameters, feedbackSchema, overallRemarks, auditDate } =
      req.body;
    if (!studentId || !parameters?.length)
      return res
        .status(400)
        .json({ message: "studentId & parameters required" });

    for (const p of parameters) {
      if (Number(p.score) > (Number(p.totalScore) || 10)) {
        return res.status(400).json({ message: `Obtained score cannot exceed total score for parameter: ${p.name}` });
      }
    }

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


export const saveDraftReport = async (req, res) => {
  try {
    //fields coming from the frontend
    const { studentId, parameters, feedbackSchema, overallRemarks, auditDate } =
      req.body;

    //studentId is mandatory else draft is not identify
    if (!studentId) {
      return res.status(400).json({ message: "studentId required" });
    }

    if (parameters && parameters.length) {
      for (const p of parameters) {
        if (Number(p.score) > (Number(p.totalScore) || 10)) {
          return res.status(400).json({ message: `Obtained score cannot exceed total score for parameter: ${p.name}` });
        }
      }
    }

    //same student + same audit date backend search the same existing draft (no multiple drafts craeated)
    let draft = await Report.findOne({
      student: studentId,
      auditDate: auditDate,
      status: "draft",
    });

    if (draft) {
      //if draft already exist
      draft.parameters = parameters;
      draft.feedbackSchema = [feedbackSchema]  //wrap in array bcoz schema is in array
      draft.overallRemarks = overallRemarks;

      await draft.save();

      return res.json({ message: "Draft updated", report: draft })
    }

    //if draft is not not exist
    const newDraft = await Report.create({
      student: studentId,
      parameters,
      feedbackSchema: [feedbackSchema],
      overallRemarks,
      auditDate,
      status: "draft",
    });

    res.json({ message: "Draft saved", report: newDraft });  //calling frontend successfully darft saved
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//purpose: existing form should be auto-load when draft opened  
export const getDraftReport = async (req, res) => {
  try {
    //query params gives studentId and dates
    const { studentId, auditDate } = req.query;

    //Draft search the same student and same date in DB
    const draft = await Report.findOne({
      student: studentId,
      auditDate: auditDate,
      status: "draft",
    });

    //if draft found return it or else new page is loaded by frontend
    res.json(draft || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      if (batch_no && String(r.student.batch_no) !== String(batch_no))
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

export const getAllDrafts = async (req, res) => {
  try {
    const draft = await Report.find({ status: "draft" }) //only drafts reports
      .populate("student", "name email batch_name batch_no") //student info join
      .sort({ updatedAt: -1 }); //latest updated draft on top

    // Defensive check: If some reports have null student (e.g. student deleted), we might want to filter them out or handle them
    // For now, we return as is, but frontend should handle null student.
    res.json(draft); //send the list to the frontend table
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: "Draft Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteReport = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: "Report Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔥 NEW: Lookup existing report/draft for auto-fill feature
export const lookupReportByStudentAndDate = async (req, res) => {
  try {
    const { studentId, auditDate } = req.query;

    if (!studentId || !auditDate) {
      return res.status(400).json({ message: "studentId and auditDate required" });
    }

    // Try to find an existing report (prioritize draft if both exist)
    const report = await Report.findOne({ 
      student: studentId, 
      auditDate: new Date(auditDate) 
    }).sort({ status: 1 }); // "draft" usually comes before "published" alphabetically, but we should be careful. 
    
    // Better sorting: drafts usually updated more recently
    // const report = await Report.findOne({ student: studentId, auditDate: new Date(auditDate) }).sort({ updatedAt: -1 });

    if (!report) return res.json(null);

    // Return the report data for pre-fill
    return res.json({
      _id: report._id,
      status: report.status,
      parameters: report.parameters,
      feedbackSchema: report.feedbackSchema?.[0] || { point1: "", point2: "", point3: "" },
      overallRemarks: report.overallRemarks
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

export const generateReportPdf = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("student");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=report-${report._id}.pdf`
    );

    doc.pipe(res);

    const headerImg = path.join(process.cwd(), "public", "newHeader.jpeg");
    const footerImg = path.join(process.cwd(), "public", "newFooter.jpeg");
    const PAGE_BOTTOM = 670;
    const FOOTER_HEIGHT = 100;

    // ---------- Helpers ----------
    const drawHeader = () => {
      doc.image(headerImg, 0, 0, { width: 595 });
      doc.moveDown(1);
    };

    const drawFooter = () => {
      const footerWidth = 600; // choose actual width you want
      const footerY = doc.page.height - FOOTER_HEIGHT;
      const footerX = doc.page.width - footerWidth;

      doc.image(footerImg, footerX, footerY, {
        width: footerWidth,
        height: FOOTER_HEIGHT,
      });
    };

    const ensureSpace = (space = 60) => {
      if (doc.y + space > PAGE_BOTTOM) {
        drawFooter();
        doc.addPage();
        drawHeader();
        doc.moveDown(5)
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
    const batchName = report.student?.batch_name || "N/A";
    const batchNo = report.student?.batch_no || "N/A";

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
    // const startY = 120;
    const lineGap = 14;

    // Right column width
    const columnWidth = 160;

    // X position where text should END (right aligned)
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
        `Audit Date : ${new Date(report.auditDate).toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 2,
        {
          width: columnWidth,
          align: "right",
        }
      )
      .text(
        `Generated : ${new Date().toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 3,
        {
          width: columnWidth,
          align: "right",
        }
      );


    doc.moveDown(3);

    // ---------- Performance Parameters ----------
    ensureSpace(100);

    // Section title
    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Performance Parameters", 50);

    doc.moveDown(1);

    // const pageWidth = doc.page.width;
    const leftX = 50;
    // const rightMargin = 50;
    const cardWidth = pageWidth - leftX - rightMargin;
    const cardHeight = 34;
    const radius = 6;

    report.parameters.forEach((p) => {
      ensureSpace(cardHeight + 10);

      const y = doc.y;

      /* ---- Card container ---- */
      doc
        .roundedRect(leftX, y, cardWidth, cardHeight, radius)
        .lineWidth(1)
        .strokeColor("#E5E7EB") // light gray border
        .stroke();

      /* ---- Parameter name (left) ---- */
      doc
        .fontSize(10)
        .fillColor("#000")
        .font("Helvetica")
        .text(p.name, leftX + 12, y + 10, {
          width: cardWidth - 120,
          align: "left",
        });
      let percentage = (p.score / (p.totalScore || 10)) * 100;
      let badgeStrokeColor = "#10B981"; // green
      let badgeTextColor = "#059669";

      if (percentage <= 40) {
        badgeStrokeColor = "#EF4444"; // red
        badgeTextColor = "#DC2626";
      } else if (percentage <= 70) {
        badgeStrokeColor = "#F59E0B"; // yellow
        badgeTextColor = "#D97706";
      }
      /* ---- Score badge (right) ---- */
      const badgeWidth = 60;
      const badgeHeight = 20;
      const badgeX = leftX + cardWidth - badgeWidth - 12;
      const badgeY = y + 7;

      doc
        .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 5)
        .lineWidth(1)
        .strokeColor(badgeStrokeColor)
        .stroke();

      doc
        .fontSize(10)
        .fillColor(badgeTextColor)
        .font("Helvetica-Bold")
        .text(`${p.score} / ${p.totalScore || 10}`, badgeX, badgeY + 5, {
          width: badgeWidth,
          align: "center",
        });

      doc.moveDown(2);
    });

    let grandObtained1 = 0;
    let grandTotal1 = 0;
    report.parameters.forEach(p => {
      if (p.name && p.name.trim()) {
        grandObtained1 += Number(p.score) || 0;
        grandTotal1 += Number(p.totalScore) || 10;
      }
    });
    
    const grandPercentage1 = grandTotal1 > 0 ? (grandObtained1 / grandTotal1) * 100 : 0;
    const getGrade1 = (percentage) => {
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B+";
      if (percentage >= 60) return "B";
      if (percentage >= 50) return "C";
      if (percentage >= 40) return "D";
      if (grandTotal1 === 0) return "-";
      return "F";
    };
    const grade1 = getGrade1(grandPercentage1);

    ensureSpace(cardHeight + 10);
    const gtY1 = doc.y;
    doc
      .roundedRect(leftX, gtY1, cardWidth, cardHeight, radius)
      .lineWidth(1)
      .strokeColor("#E5E7EB") // light gray border
      .stroke();

    doc
      .fontSize(10)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Grand Total", leftX + 12, gtY1 + 10, {
        width: cardWidth - 120,
        align: "left",
      });

    const gtBadgeWidth1 = 120;
    const gtBadgeHeight1 = 20;
    const gtBadgeX1 = leftX + cardWidth - gtBadgeWidth1 - 12;
    const gtBadgeY1 = gtY1 + 7;

    doc
      .roundedRect(gtBadgeX1, gtBadgeY1, gtBadgeWidth1, gtBadgeHeight1, 5)
      .lineWidth(1)
      .fillAndStroke("#EFF6FF", "#BFDBFE");

    doc
      .fontSize(10)
      .fillColor("#1D4ED8")
      .font("Helvetica-Bold")
      .text(`${grandObtained1} / ${grandTotal1}  |  Grade: ${grade1}`, gtBadgeX1, gtBadgeY1 + 5, {
        width: gtBadgeWidth1,
        align: "center",
      });

    doc.moveDown(1.5);

    // ---------- Overall Remarks ----------
    ensureSpace(100);

    // Section title
    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Overall Remarks", 50);

    doc.moveDown(0.6);

    // Layout constants
    // const leftX = 50;
    // const rightMargin = 50;
    const boxWidth = doc.page.width - leftX - rightMargin;
    const padding = 12;
    const minHeight = 40;
    // const radius = 6;

    // Calculate text height FIRST
    doc.fontSize(10).font("Helvetica");
    const remarksText = report.overallRemarks || "-";

    const textHeight = doc.heightOfString(remarksText, {
      width: boxWidth - padding * 2,
    });

    // Final box height (auto-expand)
    const boxHeight = Math.max(minHeight, textHeight + padding * 2);

    ensureSpace(boxHeight + 10);

    const y = doc.y;

    /* ---- Draw container ---- */
    doc
      .roundedRect(leftX, y, boxWidth, boxHeight, radius)
      .lineWidth(1)
      .strokeColor("#E5E7EB") // light gray border
      .stroke();

    /* ---- Draw text inside ---- */
    doc
      .fillColor("#000")
      .text(remarksText, leftX + padding, y + padding, {
        width: boxWidth - padding * 2,
        align: "left",
      });

    // Move cursor BELOW the box
    doc.y = y + boxHeight + 12;


    doc.moveDown(2);

    // ---------- Feedback Points ----------
    ensureSpace(100);

    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Feedback Points", 50);

    doc.moveDown(1);

    const feedback = [
      report.feedbackSchema?.[0]?.point1,
      report.feedbackSchema?.[0]?.point2,
      report.feedbackSchema?.[0]?.point3,
    ];

    feedback.forEach((f, i) => {
      ensureSpace(30);

      const y = doc.y;

      doc
        .fontSize(10)
        .fillColor("#000")
        .font("Helvetica")
        .text(`${i + 1}.`, 50, y, { width: 20 });

      doc
        .fontSize(10)
        .fillColor("#000")
        .text(f || "-", 75, y, {
          width: 470,
        });

      doc.moveDown(1.5);
    });

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

export const generateReportPreviewPdf = async (req, res) => {
  try {
    const {
      student,
      parameters = [],
      feedbackSchema,
      overallRemarks = "-",
      auditDate,
    } = req.body;

    if (!student || !parameters.length) {
      return res.status(400).json({
        message: "student and parameters are required for preview",
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=report-preview.pdf"
    );

    doc.pipe(res);

    const headerImg = path.join(process.cwd(), "public", "newHeader.jpeg");
    const footerImg = path.join(process.cwd(), "public", "newFooter.jpeg");

    const PAGE_BOTTOM = 670;
    const FOOTER_HEIGHT = 100;

    // ---------- Helpers ----------
    const drawHeader = () => {
      doc.image(headerImg, 0, 0, { width: 595 });
      doc.moveDown(1);
    };

    const drawFooter = () => {
      const footerWidth = 600;
      const footerY = doc.page.height - FOOTER_HEIGHT;
      const footerX = doc.page.width - footerWidth;

      doc.image(footerImg, footerX, footerY, {
        width: footerWidth,
        height: FOOTER_HEIGHT,
      });
    };

    const ensureSpace = (space = 60) => {
      if (doc.y + space > PAGE_BOTTOM) {
        drawFooter();
        doc.addPage();
        drawHeader();
        doc.moveDown(6);
      }
    };

    // ---------- First Page ----------
    drawHeader();

    // ---------- Student Info ----------
    const startY = doc.y + 70;

    const studentName = student.name || "Student Name Missing";
    const studentEmail = student.email || "";
    const batchName = student.batch_name || "N/A";
    const batchNo = student.batch_no || "N/A";

    doc
      .fontSize(14)
      .fillColor("#23a9de")
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
        `Audit Date : ${new Date(auditDate).toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 2,
        { width: columnWidth, align: "right" }
      )
      .text(
        `Generated : ${new Date().toLocaleDateString()}`,
        xRight - columnWidth,
        startY + lineGap * 3,
        { width: columnWidth, align: "right" }
      );

    doc.moveDown(3);

    // ---------- Performance Parameters ----------
    ensureSpace(100);

    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Performance Parameters", 50);

    doc.moveDown(1);

    const leftX = 50;
    const cardWidth = pageWidth - leftX - rightMargin;
    const cardHeight = 34;
    const radius = 6;

    parameters.forEach((p) => {
      ensureSpace(cardHeight + 10);

      const y = doc.y;

      doc
        .roundedRect(leftX, y, cardWidth, cardHeight, radius)
        .lineWidth(1)
        .strokeColor("#E5E7EB")
        .stroke();

      doc
        .fontSize(10)
        .fillColor("#000")
        .font("Helvetica")
        .text(p.name, leftX + 12, y + 10, {
          width: cardWidth - 120,
        });

      let percentage = (p.score / (p.totalScore || 10)) * 100;
      let badgeStrokeColor = "#10B981";
      let badgeTextColor = "#059669";

      if (percentage <= 40) {
        badgeStrokeColor = "#EF4444";
        badgeTextColor = "#DC2626";
      } else if (percentage <= 70) {
        badgeStrokeColor = "#F59E0B";
        badgeTextColor = "#D97706";
      }

      const badgeWidth = 60;
      const badgeHeight = 20;
      const badgeX = leftX + cardWidth - badgeWidth - 12;
      const badgeY = y + 7;

      doc
        .roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 5)
        .lineWidth(1)
        .strokeColor(badgeStrokeColor)
        .stroke();

      doc
        .fontSize(10)
        .fillColor(badgeTextColor)
        .font("Helvetica-Bold")
        .text(`${p.score} / ${p.totalScore || 10}`, badgeX, badgeY + 5, {
          width: badgeWidth,
          align: "center",
        });

      doc.moveDown(2);
    });

    let grandObtained2 = 0;
    let grandTotal2 = 0;
    report.parameters.forEach(p => {
      if (p.name && p.name.trim()) {
        grandObtained2 += Number(p.score) || 0;
        grandTotal2 += Number(p.totalScore) || 10;
      }
    });
    
    const grandPercentage2 = grandTotal2 > 0 ? (grandObtained2 / grandTotal2) * 100 : 0;
    const getGrade2 = (percentage) => {
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B+";
      if (percentage >= 60) return "B";
      if (percentage >= 50) return "C";
      if (percentage >= 40) return "D";
      if (grandTotal2 === 0) return "-";
      return "F";
    };
    const grade2 = getGrade2(grandPercentage2);

    ensureSpace(cardHeight + 10);
    const gtY2 = doc.y;
    doc
      .roundedRect(leftX, gtY2, cardWidth, cardHeight, radius)
      .lineWidth(1)
      .strokeColor("#E5E7EB") // light gray border
      .stroke();

    doc
      .fontSize(10)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Grand Total", leftX + 12, gtY2 + 10, {
        width: cardWidth - 120,
        align: "left",
      });

    const gtBadgeWidth2 = 120;
    const gtBadgeHeight2 = 20;
    const gtBadgeX2 = leftX + cardWidth - gtBadgeWidth2 - 12;
    const gtBadgeY2 = gtY2 + 7;

    doc
      .roundedRect(gtBadgeX2, gtBadgeY2, gtBadgeWidth2, gtBadgeHeight2, 5)
      .lineWidth(1)
      .fillAndStroke("#EFF6FF", "#BFDBFE");

    doc
      .fontSize(10)
      .fillColor("#1D4ED8")
      .font("Helvetica-Bold")
      .text(`${grandObtained2} / ${grandTotal2}  |  Grade: ${grade2}`, gtBadgeX2, gtBadgeY2 + 5, {
        width: gtBadgeWidth2,
        align: "center",
      });

    doc.moveDown(1.5);

    // ---------- Overall Remarks ----------
    ensureSpace(100);

    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Overall Remarks", 50);

    doc.moveDown(0.6);

    const boxWidth = doc.page.width - leftX - rightMargin;
    const padding = 12;
    const minHeight = 40;

    doc.fontSize(10).font("Helvetica");

    const textHeight = doc.heightOfString(overallRemarks, {
      width: boxWidth - padding * 2,
    });

    const boxHeight = Math.max(minHeight, textHeight + padding * 2);

    ensureSpace(boxHeight + 10);

    const y = doc.y;

    doc
      .roundedRect(leftX, y, boxWidth, boxHeight, radius)
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .stroke();

    doc.text(overallRemarks, leftX + padding, y + padding, {
      width: boxWidth - padding * 2,
    });

    doc.y = y + boxHeight + 20;

    // ---------- Feedback ----------
    ensureSpace(120);

    doc
      .fontSize(12)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text("Feedback Points", 50);

    doc.moveDown(1);

    const feedback = [
      feedbackSchema?.point1,
      feedbackSchema?.point2,
      feedbackSchema?.point3,
    ];

    feedback.forEach((f, i) => {
      ensureSpace(30);
      doc.text(`${i + 1}. ${f || "-"}`, 50);
      doc.moveDown(1.5);
    });

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
    console.error("PDF PREVIEW ERROR:", err);
    res.status(500).json({ message: "Preview PDF generation failed" });
  }
};