import express from "express";
import {
  createNotification,
  getNotifications,
  markRead
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getNotifications);
router.post("/", verifyToken, createNotification);
router.patch("/:id", verifyToken, markRead);

export default router;
