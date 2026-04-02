import express from "express";
import {
createAnnouncement,
getAnnouncements,
deleteAnnouncement,
} from "../controllers/announcement.controller.js";

const router = express.Router();

router.get("/", getAnnouncements);
router.post("/", createAnnouncement);
router.delete("/:id", deleteAnnouncement);

export default router;
