import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { JWT_SECRET } from "../config/env.js";
import { sendEmail } from "../utils/email.js";

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }
    email = String(email).trim().toLowerCase();
    password = String(password).trim();

    let user = null;
    let role = "";

    // 1. Check Admin
    user = await Admin.findOne({ email });
    if (user) {
      role = "admin";
    }

    // 2. Check Teacher
    if (!user) {
      user = await Teacher.findOne({ email });
      if (user) {
        role = "teacher";
        if (!user.isActive) {
          return res.status(403).json({ message: "Your account is pending approval from admin" });
        }
      }
    }

    // 3. Check Student
    if (!user) {
      user = await Student.findOne({ email });
      if (user) {
        role = "student";
        if (user.isActive === false) {
          return res.status(403).json({ message: "Your account is pending approval from the admin" });
        }
      }
    }

    // No user found
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update lastLogin for Student
    if (role === "student") {
      user.lastLogin = new Date();
      await user.save();
    }

    // Sign Token
    const token = jwt.sign({ id: user._id, role }, JWT_SECRET, { expiresIn: "7d" });

    // Return payload matching the respective role format
    const responsePayload = {
      message: "Logged in successfully",
      token,
      role,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role
      }
    };

    if (role === "teacher") {
      responsePayload.teacher = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "teacher"
      };
    } else if (role === "student") {
      responsePayload.student = {
        id: user._id,
        name: user.name,
        email: user.email,
        batch_name: user.batch_name,
        batch_no: user.batch_no,
        role: "student"
      };
    } else {
      responsePayload.admin = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "admin"
      };
    }

    return res.status(200).json(responsePayload);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({ message: "Logged out successfully" });
};

export const getProfile = async (req, res) => {
  try {
    const { id, role } = req.user;
    let profile = null;

    if (role === "admin") {
      profile = await Admin.findById(id).select("-password").lean();
    } else if (role === "teacher") {
      profile = await Teacher.findById(id).select("-password").lean();
    } else if (role === "student") {
      profile = await Student.findById(id).select("-password").lean();
    }

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ role, profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    const payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    const newToken = jwt.sign({ id: payload.id, role: payload.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(200).json({ token: newToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { id, role } = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required" });
    }

    let Model = null;
    if (role === "admin") Model = Admin;
    else if (role === "teacher") Model = Teacher;
    else if (role === "student") Model = Student;

    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong Password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    email = email.toLowerCase();

    let user = await Admin.findOne({ email }) || await Teacher.findOne({ email }) || await Student.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found with this email" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await user.save();

    // Send email
    await sendEmail({
      to: email,
      subject: "Password Reset OTP - Tech Audit Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563EB; margin-bottom: 20px;">Tech Audit Portal Password Reset</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password. Use the following OTP to reset it:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #cbd5e1; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center;">
            ${otp}
          </div>
          <p style="color: #ef4444; font-size: 13px;">This OTP will expire in 15 minutes.</p>
          <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">Best regards,<br>Tech Audit Administration</p>
        </div>
      `
    });

    return res.status(200).json({ message: "Password reset OTP sent to your email successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    email = email.toLowerCase();

    let Model = null;
    let user = await Admin.findOne({ email });
    if (user) Model = Admin;
    if (!user) {
      user = await Teacher.findOne({ email });
      if (user) Model = Teacher;
    }
    if (!user) {
      user = await Student.findOne({ email });
      if (user) Model = Student;
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate OTP
    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Validate Expiry
    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Reset password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOtp = ""; // Clear OTP
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
