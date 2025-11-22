import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export const generateStudentReportPDF = async (report, student) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const html = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h2 { color: #16a34a; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
        th { background: #f3f4f6; }
        .feedback { margin-top: 15px; }
        .remarks { margin-top: 20px; font-style: italic; }
      </style>
    </head>
    <body>
      <h2>Technical Audit Report</h2>
      <p><strong>Student:</strong> ${student.name}</p>
      <p><strong>Batch:</strong> ${student.batch_name}-${student.batch_no}</p>
      <p><strong>Audit Date:</strong> ${new Date(
        report.auditDate
      ).toLocaleDateString()}</p>

      <h3>Parameters</h3>
      <table>
        <tr><th>Parameter</th><th>Score</th></tr>
        ${report.parameters
          .map(
            (p) =>
              `<tr><td>${p.name}</td><td style="color:#059669;">${
                p.score ?? "N/A"
              }</td></tr>`
          )
          .join("")}
      </table>

      ${
        report.feedbackSchema?.length
          ? `<div class="feedback">
              <h3>Feedback</h3>
              ${report.feedbackSchema
                .map(
                  (f) =>
                    `<ul>
                      ${f.point1 ? `<li>${f.point1}</li>` : ""}
                      ${f.point2 ? `<li>${f.point2}</li>` : ""}
                      ${f.point3 ? `<li>${f.point3}</li>` : ""}
                    </ul>`
                )
                .join("")}
            </div>`
          : ""
      }

      ${
        report.overallRemarks
          ? `<div class="remarks">“${report.overallRemarks}”</div>`
          : ""
      }
    </body>
  </html>
  `;

  await page.setContent(html);
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

  const filePath = path.join(
    uploadsDir,
    `${student.name.replace(/\s/g, "_")}-${Date.now()}.pdf`
  );
  await page.pdf({ path: filePath, format: "A4" });
  await browser.close();

  return filePath;
};
