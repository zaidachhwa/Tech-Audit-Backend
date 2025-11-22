import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { Student } from "../models/student.model.js";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden: Admins only" });
  next();
};

export const isStudent = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "student")
    return res.status(403).json({ message: "Forbidden: Students only" });
  next();
};

export const isTeacher = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "teacher")
    return res.status(403).json({ message: "Forbidden: Teachers only" });
  next();
};
