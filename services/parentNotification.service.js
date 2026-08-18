import { Student } from "../models/student.model.js";
import { sendWhatsAppMessage } from "../utils/whatsapp.js";
import { sendEmail } from "../utils/email.js";

/**
 * Notifies the students and their parents via Email and WhatsApp.
 * @param {Array<string>} studentIds - Array of student IDs to notify.
 * @param {string} subject - The subject of the notification.
 * @param {string} message - The body of the notification.
 */
export const notifyParents = async (studentIds, subject, message) => {
  try {
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return;
    }

    const students = await Student.find({
      _id: { $in: studentIds },
    }).lean();

    if (!students || students.length === 0) {
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || "https://tech.nexcoreinstitute.org";
    const notifications = [];

    for (const student of students) {
      // 1. Prepare student-specific message text
      const studentMsg = message
        .replace(/Your child was/gi, "You were")
        .replace(/Your child has/gi, "You have")
        .replace(/Your child/gi, "You")
        .replace(/their attendance/gi, "your attendance");

      // 2. Send notification Email directly to Student
      if (student.email) {
        const studentHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
            <h2 style="color: #2563EB; margin-top: 0;">Nexcore Institute of Technology</h2>
            <p>Dear <strong>${student.name}</strong>,</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 16px 0; border: 1px solid #cbd5e1; line-height: 1.6;">
              <p style="white-space: pre-wrap; margin: 0;">${studentMsg}</p>
            </div>
            <p style="margin-top: 20px; font-size: 14px;">View details on the portal: <a href="${frontendUrl}" style="color: #2563EB; text-decoration: underline;">${frontendUrl}</a></p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0;">This is an automated notification from Nexcore Institute of Technology.</p>
          </div>
        `;

        notifications.push(
          sendEmail({
            to: student.email,
            subject: `[Nexcore Institute] ${subject}`,
            html: studentHtml,
          }).catch((err) => {
            console.error(`Failed to send Email to student ${student.name} (${student.email}):`, err.message);
          })
        );
      }

      // 3. Collect unique Parent Emails
      const parentEmails = new Set();
      if (student.parentEmail && typeof student.parentEmail === "string" && student.parentEmail.trim()) {
        parentEmails.add(student.parentEmail.trim());
      }
      if (student.fatherEmail && typeof student.fatherEmail === "string" && student.fatherEmail.trim()) {
        parentEmails.add(student.fatherEmail.trim());
      }
      if (student.motherEmail && typeof student.motherEmail === "string" && student.motherEmail.trim()) {
        parentEmails.add(student.motherEmail.trim());
      }

      // 4. Send notification Email to Parents
      if (parentEmails.size > 0) {
        const parentHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
            <h2 style="color: #2563EB; margin-top: 0;">Notice for Parent of ${student.name}</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 16px 0; border: 1px solid #cbd5e1; line-height: 1.6;">
              <p style="white-space: pre-wrap; margin: 0;">${message}</p>
            </div>
            <p style="margin-top: 20px; font-size: 14px;">Portal Link: <a href="${frontendUrl}" style="color: #2563EB; text-decoration: underline;">${frontendUrl}</a></p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94A3B8; margin-bottom: 0;">This is an automated notification from Nexcore Institute of Technology.</p>
          </div>
        `;

        for (const pEmail of parentEmails) {
          notifications.push(
            sendEmail({
              to: pEmail,
              subject: `[Nexcore Institute] ${subject}`,
              html: parentHtml,
            }).catch((err) => {
              console.error(`Failed to send Email to parent (${pEmail}) of ${student.name}:`, err.message);
            })
          );
        }
      }

      // 5. Collect unique Parent WhatsApp phone numbers
      const parentPhones = new Set();
      if (student.parentPhoneNo && typeof student.parentPhoneNo === "string" && student.parentPhoneNo.trim()) {
        parentPhones.add(student.parentPhoneNo.trim());
      }
      if (student.fatherPhone && typeof student.fatherPhone === "string" && student.fatherPhone.trim()) {
        parentPhones.add(student.fatherPhone.trim());
      }
      if (student.motherPhone && typeof student.motherPhone === "string" && student.motherPhone.trim()) {
        parentPhones.add(student.motherPhone.trim());
      }

      // 6. Send WhatsApp to Parents
      for (const phone of parentPhones) {
        const formattedMessage = `*Notice for Parent of ${student.name}*\n\n${message}`;
        notifications.push(
          sendWhatsAppMessage(phone, formattedMessage).catch((err) => {
            console.error(`Failed to send WhatsApp to parent of ${student.name} (${phone}):`, err.message);
          })
        );
      }
    }

    // Execute all notifications concurrently
    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
    }
  } catch (error) {
    console.error("❌ Error in notifyParents:", error.message);
  }
};

export const notifyStudentAndParents = notifyParents;

