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

import { errorHandler } from "./middleware/error.middleware.js";
import {
  MONGODB_URL,
  PORT,
  CORS_ORIGIN,
  DEPLOYED_CORS_ORIGIN,
} from "./config/env.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.use(
  cors({
    origin: [DEPLOYED_CORS_ORIGIN, CORS_ORIGIN],
    credentials: true,
  })
);

// CONNECT DB
mongoose
  .connect(MONGODB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Mongo Error:", err));

// ROUTES
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/syllabus", syllabusRoutes);

app.use("/api/analytics", analyticsRoutes);

// ERROR HANDLER
app.use(errorHandler);

const SERVER_PORT = process.env.PORT;
console.log(SERVER_PORT);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
