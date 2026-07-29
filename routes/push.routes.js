import express from "express";
import { subscribeToPush } from "../controllers/push.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/subscribe", verifyToken, subscribeToPush);

export default router;
