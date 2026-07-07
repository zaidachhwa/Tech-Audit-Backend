import express from "express";
import {
  login,
  logout,
  getProfile,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.get("/profile", verifyToken, getProfile);
router.patch("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
