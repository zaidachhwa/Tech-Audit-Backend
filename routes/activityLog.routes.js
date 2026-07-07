import express from "express";
import { getActivityLogs } from "../controllers/activityLog.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, isAdmin, getActivityLogs);

export default router;
