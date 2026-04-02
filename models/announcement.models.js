import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
{
title: String,
description: String,
batchName: String,
priority: {
type: String,
enum: ["info", "important", "urgent"],
default: "info",
},
createdBy: String,
},
{ timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
