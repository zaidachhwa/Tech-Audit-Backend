import nodemailer from "nodemailer";

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
 * Sends login credentials to the student.
 * If SMTP credentials are not configured in environment, it logs the email to console for development.
 */
export const sendStudentCredentials = async (email, name, password) => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  let from = process.env.EMAIL_FROM || '"Tech Audit Portal" <no-reply@tech-audit.com>';
  if (from && !from.includes("<") && !from.includes("@")) {
    from = `"${from.replace(/"/g, '')}" <${user}>`;
  }

  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL SIMULATION] CREDENTIALS FOR STUDENT:`);
  console.log(`Name:      ${name}`);
  console.log(`Email/ID:  ${email}`);
  console.log(`Password:  ${password}`);
  console.log(`======================================================\n`);

  if (!host || !user || !pass) {
    console.log("⚠️ SMTP email host/user/pass not configured in .env. Skipping actual SMTP mail send.");
    return { success: false, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://tech.nexcoreinstitute.org';

  const mailOptions = {
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
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Credentials email sent successfully to ${email}`);
    return { success: true, simulated: false };
  } catch (error) {
    console.error(`Failed to send credentials email to ${email}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Generic function to send an email.
 * @param {Object} options - { to, subject, html }
 */
export const sendEmail = async ({ to, subject, html }) => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  let from = process.env.EMAIL_FROM || '"Tech Audit Portal" <no-reply@tech-audit.com>';
  if (from && !from.includes("<") && !from.includes("@")) {
    from = `"${from.replace(/"/g, '')}" <${user}>`;
  }

  if (!host || !user || !pass) {
    console.log(`⚠️ SMTP not configured. Simulated Email to ${to}: ${subject}`);
    return { success: false, simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};
