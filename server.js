import "./config/env.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import adminRoutes from "./routes/admin.routes.js";
import studentRoutes from "./routes/student.routes.js";
import batchRoutes from "./routes/batch.routes.js";
import projectRoutes from "./routes/project.routes.js";
import reportRoutes from "./routes/report.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import syllabusRoutes from "./routes/syllabus.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import homeworkRoutes from "./routes/homework.routes.js";
import lectureRoutes from "./routes/lecture.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import scheduleRoutes from "./routes/schedule.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import chapterRoutes from "./routes/chapter.routes.js";
import studentBatchRoutes from "./routes/studentBatch.routes.js";
import referenceRoutes from "./routes/reference.routes.js";
import teacherMappingRoutes from "./routes/teacherMapping.routes.js";
import reportV2Routes from "./routes/reportV2.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import activityLogRoutes from "./routes/activityLog.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import lmsRoutes from "./routes/lms.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import {
  MONGODB_URL,
  PORT,
  CORS_ORIGIN,
  DEPLOYED_CORS_ORIGIN,
} from "./config/env.js";




const app = express();
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: [DEPLOYED_CORS_ORIGIN, CORS_ORIGIN, "http://localhost:5173"],
    credentials: true,
  })
);

// CONNECT DB
mongoose
  .connect(MONGODB_URL)
  .then(async () => {
    console.log("MongoDB Connected");
    try {
      // Migrate Homework statuses to lowercase
      await mongoose.model("Homework").updateMany(
        { status: "Assigned" },
        { $set: { status: "assigned" } }
      );
      await mongoose.model("Homework").updateMany(
        { status: { $in: ["Pending Approval", "Submitted"] } },
        { $set: { status: "pending_review" } }
      );
      await mongoose.model("Homework").updateMany(
        { status: "Approved" },
        { $set: { status: "approved" } }
      );
      await mongoose.model("Homework").updateMany(
        { status: "Rejected" },
        { $set: { status: "rejected" } }
      );
      
      // Migrate submissions status inside homework documents
      const homeworks = await mongoose.model("Homework").find({ "submissions.status": { $exists: true } });
      for (const hw of homeworks) {
        let changed = false;
        hw.submissions.forEach((sub) => {
          const oldStatus = sub.status;
          if (oldStatus === "Pending Approval" || oldStatus === "Submitted") {
            sub.status = "pending_review";
            changed = true;
          } else if (oldStatus === "Approved") {
            sub.status = "approved";
            changed = true;
          } else if (oldStatus === "Rejected") {
            sub.status = "rejected";
            changed = true;
          }
        });
        if (changed) {
          await hw.save();
        }
      }
    } catch (migrateErr) {
      console.error("Migration error:", migrateErr);
    }
  })
  .catch((err) => console.error("Mongo Error:", err));

// ROUTES
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/student-batch", studentBatchRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/teacher-mapping", teacherMappingRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportV2Routes); // V2 reports registered before reportRoutes
app.use("/api/reports", reportRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/activity-log", activityLogRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/lms", lmsRoutes);
app.use("/api", homeworkRoutes);
app.use("/api/assignment", homeworkRoutes); // compatibility
app.use("/api", lectureRoutes);
app.use("/api/announcement", announcementRoutes);
app.use("/api/attendance", attendanceRoutes);
// ERROR HANDLER
app.use(errorHandler);

const SERVER_PORT = process.env.PORT;
console.log(SERVER_PORT);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
