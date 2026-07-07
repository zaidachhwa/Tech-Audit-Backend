import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Student } from "../models/student.model.js";
import { JWT_SECRET } from "../config/env.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

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
