import { Student } from "../models/student.model.js";
import { sendWhatsAppMessage } from "../utils/whatsapp.js";
import { sendEmail } from "../utils/email.js";

/**
 * Notifies the parents of the given students via WhatsApp and Email.
 * @param {Array<string>} studentIds - Array of student IDs to notify.
 * @param {string} subject - The subject of the notification (used for email).
 * @param {string} message - The body of the notification.
 */
export const notifyParents = async (studentIds, subject, message) => {
  try {
    const students = await Student.find({
      _id: { $in: studentIds },
      $or: [
        { parentEmail: { $exists: true, $ne: "" } },
        { parentPhoneNo: { $exists: true, $ne: "" } }
      ]
    }).lean();

    const notifications = [];

    for (const student of students) {
      // 1. Send WhatsApp
      if (student.parentPhoneNo) {
        // Simple delay to prevent rate limits
        const formattedMessage = `*Notice for Parent of ${student.name}*\n\n${message}`;
        notifications.push(
          sendWhatsAppMessage(student.parentPhoneNo, formattedMessage).catch(err => {
            console.error(`Failed to send WhatsApp to parent of ${student.name}:`, err.message);
          })
        );
      }

      // 2. Send Email
      if (student.parentEmail) {
        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563EB;">Notice for Parent of ${student.name}</h2>
            <p style="white-space: pre-wrap;">${message}</p>
            <hr style="border: 0; border-top: 1px solid #E2E8F0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94A3B8;">This is an automated notification from Nexcore Institute of Technology.</p>
          </div>
        `;
        notifications.push(
          sendEmail({
            to: student.parentEmail,
            subject: `[Nexcore Institute] ${subject}`,
            html,
          }).catch(err => {
            console.error(`Failed to send Email to parent of ${student.name}:`, err.message);
          })
        );
      }
    }

    // Execute all notifications without blocking completely
    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
      console.log(`✅ Sent parent notifications to ${students.length} parents.`);
    }

  } catch (error) {
    console.error("❌ Error in notifyParents:", error.message);
  }
};
