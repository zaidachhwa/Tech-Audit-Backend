import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Generates a random readable password.
 */
export const generateRandomPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // readable chars (no o/0, l/1, i/I)
  let pwd = "";
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "@";
};

/**
 * Formats a clean and valid sender email address
 */
const getFromAddress = () => {
  const user = process.env.EMAIL_USER;
  let from = process.env.EMAIL_FROM || 'Tech Audit Portal';
  from = from.replace(/^["']|["']$/g, '').trim();

  if (user && !from.includes('<') && !from.includes('@')) {
    return `"${from}" <${user}>`;
  }
  return from;
};

/**
 * Creates or retrieves a Nodemailer transporter if SMTP credentials are configured.
 */
const getTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
};

/**
 * Sends login credentials to the student.
 */
export const sendStudentCredentials = async (email, name, password) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://tech.nexcoreinstitute.org';
  const from = getFromAddress();
  const transporter = getTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
      <h2 style="color: #2563EB; margin-bottom: 20px;">Welcome to the Tech Audit Portal!</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Your student account has been created successfully. You can now log in to the portal using the credentials below:</p>
      
      <div style="background-color: #f8fafc; padding: 18px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; line-height: 1.8;">
        <p style="margin: 6px 0;"><strong>Portal Login:</strong> <a href="${frontendUrl}/student/login" style="color: #2563EB; font-weight: bold;">${frontendUrl}/student/login</a></p>
        <p style="margin: 6px 0;"><strong>Email / Username:</strong> <span style="font-family: monospace; font-size: 14px; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${email}</span></p>
        <p style="margin: 6px 0;"><strong>Password:</strong> <span style="font-family: monospace; font-size: 14px; background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${password}</span></p>
      </div>
      
      <p style="color: #ef4444; font-size: 13px; margin-top: 10px;">* Please change your password after logging in for the first time.</p>
      <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 14px;">Best regards,<br><strong>Tech Audit Administration</strong></p>
    </div>
  `;

  const subject = "Welcome to Tech Audit Portal - Your Login Credentials";

  // 1. Try Nodemailer first if SMTP is configured
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
      });
      console.log(`[Email] Credentials sent to student ${email} (MessageId: ${info.messageId})`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error(`[Email Error] Failed to send credentials to ${email} via SMTP:`, err);
    }
  }

  // 2. Fallback to Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from,
        to: email,
        subject,
        html,
      });
      if (error) {
        console.error(`[Email Error] Resend error for ${email}:`, error);
        return { success: false, error: error.message };
      }
      return { success: true, simulated: false };
    } catch (err) {
      console.error(`[Email Error] Failed to send via Resend:`, err);
      return { success: false, error: err.message };
    }
  }

  if (!transporter && !process.env.RESEND_API_KEY) {
    console.warn(`[Email Warning] No email service configured. Simulating credentials email to ${email}`);
    return { success: false, simulated: true };
  }

  return { success: false, error: "Failed to send credentials email" };
};

/**
 * Generic function to send an email.
 * @param {Object} options - { to, subject, html }
 */
export const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();
  const transporter = getTransporter();

  // 1. Try Nodemailer first if SMTP is configured
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      console.log(`[Email] Email sent to ${to} (Subject: "${subject}")`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Error] Failed to send email to ${to} via SMTP:`, err);
      if (!process.env.RESEND_API_KEY) throw err;
    }
  }

  // 2. Fallback to Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });
      if (error) {
        console.error(`[Email Error] Resend error for ${to}:`, error);
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      console.error(`[Email Error] Failed to send to ${to} via Resend:`, err);
      throw err;
    }
  }

  if (!transporter && !process.env.RESEND_API_KEY) {
    console.warn(`[Email Warning] No email provider configured. Simulating email to ${to}`);
    return { success: false, simulated: true };
  }
};

/**
 * Sends a welcome email to parents upon student account creation.
 */
export const sendParentWelcomeEmail = async (studentNameOrOptions, batch, studentEmail, parentEmail) => {
  let name = "";
  let batchName = "";
  let email = "";
  let pEmail = null;

  if (typeof studentNameOrOptions === "object" && studentNameOrOptions !== null) {
    name = studentNameOrOptions.studentName || "";
    batchName = studentNameOrOptions.courseName || studentNameOrOptions.batch || "";
    email = studentNameOrOptions.studentEmail || "";
    pEmail = studentNameOrOptions.parentEmail;
  } else {
    name = studentNameOrOptions || "";
    batchName = batch || "";
    email = studentEmail || "";
    pEmail = parentEmail;
  }

  if (!pEmail) {
    return { success: false, simulated: true };
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://tech.nexcoreinstitute.org';
  const recipients = Array.isArray(pEmail) ? pEmail : [pEmail];
  const results = [];

  for (const recipient of recipients) {
    if (!recipient || typeof recipient !== "string" || !recipient.trim()) continue;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
        <h2 style="color: #10B981; margin-bottom: 20px;">Nexcore Institute of Technology</h2>
        <p>Dear Parent,</p>
        <p>We are writing to inform you that a student account has been successfully created for your child, <strong>${name}</strong>, at Nexcore Institute of Technology.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; line-height: 1.6;">
          <p style="margin: 5px 0;"><strong>Student Name:</strong> ${name}</p>
          ${batchName ? `<p style="margin: 5px 0;"><strong>Batch:</strong> ${batchName}</p>` : ''}
          ${email ? `<p style="margin: 5px 0;"><strong>Student Email:</strong> ${email}</p>` : ''}
          <p style="margin: 5px 0;"><strong>Portal Login:</strong> <a href="${frontendUrl}" style="color: #2563EB;">${frontendUrl}</a></p>
        </div>
        
        <p>They can now log into the portal to access their schedules, syllabus, and study materials. If you have any questions or require assistance, please contact the administration office.</p>
        <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">Best regards,<br><strong>Tech Audit Administration</strong></p>
      </div>
    `;

    try {
      await sendEmail({
        to: recipient.trim(),
        subject: "Student Account Created Successfully - Tech Audit Portal",
        html,
      });
      results.push({ email: recipient, success: true, simulated: false });
    } catch (err) {
      console.error(`Failed to send parent welcome email to ${recipient}:`, err);
      results.push({ email: recipient, success: false, error: err.message });
    }
  }

  return { success: true, results };
};
