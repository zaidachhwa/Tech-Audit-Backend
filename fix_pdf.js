const fs = require('fs');

const content = fs.readFileSync('c:/nexcore/Tech-Audit/Tech-Audit-Backend/controllers/performanceReport.controller.js', 'utf8');

const prefix = content.substring(0, content.indexOf('export const downloadPdf = async (req, res) => {'));

const newDownloadPdf = `export const downloadPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await PerformanceReport.findById(id).populate("student").populate("batch");
    
    if (!report) return res.status(404).json({ message: "Report not found" });

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      \`inline; filename=performance-report-\${report.student.name.replace(/\\s+/g, "_")}.pdf\`
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
      .text(\`Batch : \${batchName}\`, xRight - columnWidth, startY, {
        width: columnWidth,
        align: "right",
      })
      .text(\`Batch No : \${batchNo}\`, xRight - columnWidth, startY + lineGap, {
        width: columnWidth,
        align: "right",
      })
      .text(
        \`Duration : \${new Date(report.startDate).toLocaleDateString()} to \${new Date(report.endDate).toLocaleDateString()}\`,
        xRight - columnWidth,
        startY + lineGap * 2,
        {
          width: columnWidth,
          align: "right",
        }
      )
      .text(
        \`Generated : \${new Date(report.createdAt).toLocaleDateString()}\`,
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
      
      const textHeight = contentLines.reduce((acc, line) => acc + doc.heightOfString(line.text || line, { width: boxWidth - padding * 2 }) + 4, 0);

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
        currentY += doc.heightOfString(line.text || line, { width: boxWidth - padding * 2 }) + 4;
      });

      doc.y = y + boxHeight + 12;
    };

    // ---------- Attendance Summary ----------
    drawCard("Attendance Summary", [
      \`Total Working Days: \${report.attendanceData.workingDays}\`,
      \`Present: \${report.attendanceData.present}\`,
      \`Absent: \${report.attendanceData.absent}\`,
      \`Attendance Percentage: \${report.attendanceData.percentage}%\`
    ]);

    // ---------- Performance Statistics ----------
    drawCard("Performance Statistics", [
      \`Total Audits Taken: \${report.auditData.length}\`,
      \`Average Score: \${report.statistics.averageScore}/10\`,
      \`Highest Score: \${report.statistics.highestScore}\`,
      \`Lowest Score: \${report.statistics.lowestScore}\`,
      \`Overall Grade: \${report.statistics.overallGrade}\`
    ]);

    // ---------- AI Performance Summary ----------
    if (report.aiSummary && report.aiSummary.strengths) {
      const summary = report.aiSummary;
      const aiLines = [];
      if (summary.strengths) aiLines.push(\`Strengths: \${summary.strengths}\`);
      if (summary.weaknesses) aiLines.push(\`Weaknesses: \${summary.weaknesses}\`);
      if (summary.areasOfImprovement) aiLines.push(\`Areas of Improvement: \${summary.areasOfImprovement}\`);
      if (summary.teacherRecommendation) aiLines.push(\`Recommendation: \${summary.teacherRecommendation}\`);
      if (summary.learningProgress) aiLines.push(\`Learning Progress: \${summary.learningProgress}\`);
      if (summary.futureRecommendation) aiLines.push(\`Future Recommendation: \${summary.futureRecommendation}\`);
      
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
`;

fs.writeFileSync('c:/nexcore/Tech-Audit/Tech-Audit-Backend/controllers/performanceReport.controller.js', prefix + newDownloadPdf);
console.log('Fixed PDF logic');
