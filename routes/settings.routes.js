import express from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, getSettings);
router.patch("/", verifyToken, isAdmin, updateSettings);

export default router;
