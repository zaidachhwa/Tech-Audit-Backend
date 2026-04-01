import express from "express";
import { saveGrades, getGrades } from "../controllers/grade.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/save", verifyToken, saveGrades);
router.get("/", verifyToken, getGrades);

export default router;