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

const getFromEmail = () => {
  let from = process.env.EMAIL_FROM || 'Tech Audit Portal <no-reply@tech-audit.com>';
  // Strip any accidental quotes from .env parsing which break Resend's format validation
  return from.replace(/^["']|["']$/g, '');
};

/**
 * Sends login credentials to the student.
 * If Resend API key is not configured in environment, it simulates the success.
 */
export const sendStudentCredentials = async (email, name, password) => {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getFromEmail();
  const frontendUrl = process.env.FRONTEND_URL || 'https://tech.nexcoreinstitute.org';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: "Welcome to Tech Audit Portal - Your Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563EB; margin-bottom: 20px;">Welcome to the Tech Audit Portal!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your student account has been created successfully. You can now log in to the portal using the credentials below:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; line-height: 1.6;">
            <p style="margin: 5px 0;"><strong>Login Link:</strong> <a href="${frontendUrl}/student/login">${frontendUrl}/student/login</a></p>
            <p style="margin: 5px 0;"><strong>Username / Email ID:</strong> <span style="font-family: monospace; font-size: 14px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${email}</span></p>
            <p style="margin: 5px 0;"><strong>Password:</strong> <span style="font-family: monospace; font-size: 14px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
          </div>
          
          <p style="color: #ef4444; font-size: 13px;">Please change your password after logging in for the first time.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">Best regards,<br>Tech Audit Administration</p>
        </div>
      `,
    });
    
    if (error) {
      console.error(`Failed to send credentials email to ${email}:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, simulated: false };
  } catch (err) {
    console.error(`Failed to send credentials email to ${email}:`, err);
    return { success: false, error: err.message };
  }
};

/**
 * Generic function to send an email.
 * @param {Object} options - { to, subject, html }
 */
export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getFromEmail();

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    
    if (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    throw err;
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

  if (!process.env.RESEND_API_KEY || !pEmail) {
    return { success: false, simulated: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = getFromEmail();
  const frontendUrl = process.env.FRONTEND_URL || 'https://tech.nexcoreinstitute.org';

  // Normalize parent emails into array
  const recipients = Array.isArray(pEmail) ? pEmail : [pEmail];
  const results = [];

  for (const recipient of recipients) {
    if (!recipient || typeof recipient !== "string" || !recipient.trim()) continue;

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: recipient.trim(),
        subject: "Student Account Created Successfully - Tech Audit Portal",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #10B981; margin-bottom: 20px;">Nexcore Institute of Technology</h2>
            <p>Dear Parent,</p>
            <p>We are writing to inform you that a student account has been successfully created for your child, <strong>${name}</strong>, at Nexcore Institute of Technology.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong>Student Name:</strong> ${name}</p>
              ${batchName ? `<p style="margin: 5px 0;"><strong>Batch:</strong> ${batchName}</p>` : ''}
              ${email ? `<p style="margin: 5px 0;"><strong>Student Email:</strong> ${email}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Portal Login:</strong> <a href="${frontendUrl}">${frontendUrl}</a></p>
            </div>
            
            <p>They can now log into the portal to access their schedules, syllabus, and study materials. If you have any questions or require assistance, please contact the administration office.</p>
            <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">Best regards,<br>Tech Audit Administration</p>
          </div>
        `,
      });
      
      if (error) {
        console.error(`Failed to send parent welcome email to ${recipient}:`, error);
        results.push({ email: recipient, success: false, error: error.message });
      } else {
        results.push({ email: recipient, success: true, simulated: false });
      }
    } catch (err) {
      console.error(`Failed to send parent welcome email to ${recipient}:`, err);
      results.push({ email: recipient, success: false, error: err.message });
    }
  }

  return { success: true, results };
};
