import { Router } from "express";
import {
  createSchedule,
  listSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule
} from "../controllers/schedule.controller.js";
import { verifyToken, isAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/create", verifyToken, isAdmin, createSchedule);
router.get("/list", verifyToken, listSchedules);
router.get("/:id", verifyToken, getScheduleById);
router.put("/update/:id", verifyToken, updateSchedule);
router.delete("/delete/:id", verifyToken, isAdmin, deleteSchedule);

export default router;
