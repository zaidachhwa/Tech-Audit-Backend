import path from "path";
import PDFDocument from "pdfkit";
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


export const saveDraftReport = async (req, res) => {
  try {
    //fields coming from the frontend
    const { studentId, parameters, feedbackSchema, overallRemarks, auditDate } =
      req.body;

    //studentId is mandatory else draft is not identify
    if (!studentId) {
      return res.status(400).json({ message: "studentId required" });
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
      .populate("student", "name email batch_name batch_no")  //student info join
      .sort({ updatedAt: -1 }); //latest updated draft on top

    res.json(draft);  //send the list to the frontend table
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

    doc
      .fontSize(14)
      .fillColor("#059669")
      .font("Helvetica-Bold")
      .text(report.student.name, 50, startY + 20);

    doc
      .fontSize(10)
      .fillColor("#666")
      .font("Helvetica")
      .text(report.student.email, 50, doc.y + 2);



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
      .text(`Batch : ${report.student.batch_name}`, xRight - columnWidth, startY, {
        width: columnWidth,
        align: "right",
      })
      .text(`Batch No : ${report.student.batch_no}`, xRight - columnWidth, startY + lineGap, {
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
      .fillColor("#059669")
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
      // ---- Score-based colors ----
      let badgeStrokeColor = "#10B981"; // green
      let badgeTextColor = "#059669";

      if (p.score <= 4) {
        badgeStrokeColor = "#EF4444"; // red
        badgeTextColor = "#DC2626";
      } else if (p.score <= 7) {
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
        .text(`${p.score} / 10`, badgeX, badgeY + 5, {
          width: badgeWidth,
          align: "center",
        });

      doc.moveDown(2);
    });

    doc.moveDown(1);

    // ---------- Overall Remarks ----------
    ensureSpace(100);

    // Section title
    doc
      .fontSize(12)
      .fillColor("#059669")
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
      .fillColor("#059669")
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

    // ---------- Signatures (FIXED POSITION) ----------

    // Position signatures safely above footer
    const sigY = doc.page.height - FOOTER_HEIGHT - 40;

    // If current flowing content is already too low, move to new page
    if (doc.y > sigY - 20) {
      doc.addPage();
      drawHeader();
    }

    // Left signature line
    doc.moveTo(50, sigY).lineTo(250, sigY).stroke();

    // Right signature line
    doc.moveTo(320, sigY).lineTo(520, sigY).stroke();

    doc
      .fontSize(9)
      .fillColor("#666")
      .font("Helvetica")
      .text(
        "Evaluator's Signature and Stamp",
        50,
        sigY + 8,
        { width: 200, align: "center" }
      )
      .text(
        "Student's Signature",
        320,
        sigY + 8,
        { width: 200, align: "center" }
      );

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

    doc
      .fontSize(14)
      .fillColor("#059669")
      .font("Helvetica-Bold")
      .text(student.name, 50, startY + 20);

    doc
      .fontSize(10)
      .fillColor("#666")
      .font("Helvetica")
      .text(student.email, 50, doc.y + 2);

    const pageWidth = doc.page.width;
    const rightMargin = 40;
    const lineGap = 14;
    const columnWidth = 160;
    const xRight = pageWidth - rightMargin;

    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`Batch : ${student.batch_name}`, xRight - columnWidth, startY, {
        width: columnWidth,
        align: "right",
      })
      .text(`Batch No : ${student.batch_no}`, xRight - columnWidth, startY + lineGap, {
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
      .fillColor("#059669")
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

      let badgeStrokeColor = "#10B981";
      let badgeTextColor = "#059669";

      if (p.score <= 4) {
        badgeStrokeColor = "#EF4444";
        badgeTextColor = "#DC2626";
      } else if (p.score <= 7) {
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
        .text(`${p.score} / 10`, badgeX, badgeY + 5, {
          width: badgeWidth,
          align: "center",
        });

      doc.moveDown(2);
    });

    // ---------- Overall Remarks ----------
    ensureSpace(100);

    doc
      .fontSize(12)
      .fillColor("#059669")
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
      .fillColor("#059669")
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
    ensureSpace(40);

    const sigY = doc.y + 40;

    doc.moveTo(50, sigY).lineTo(250, sigY).stroke();
    doc.moveTo(320, sigY).lineTo(520, sigY).stroke();

    doc
      .fontSize(9)
      .fillColor("#666")
      .text("Evaluator's Signature and Stamp", 50, sigY + 8, {
        width: 200,
        align: "center",
      })
      .text("Student's Signature", 320, sigY + 8, {
        width: 200,
        align: "center",
      });

    // ---------- Footer ----------
    drawFooter();
    doc.end();

  } catch (err) {
    console.error("PDF PREVIEW ERROR:", err);
    res.status(500).json({ message: "Preview PDF generation failed" });
  }
};