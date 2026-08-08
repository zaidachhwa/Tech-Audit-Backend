import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { LecturePunchLog } from "./models/lecturePunchLog.model.js";
import { Schedule } from "./models/schedule.model.js";
import { BatchLecture } from "./models/batchLecture.model.js";

async function clearPunchLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    // 1. Delete all LecturePunchLog entries
    const resPunchLog = await LecturePunchLog.deleteMany({});
    console.log(`Deleted ${resPunchLog.deletedCount} documents from LecturePunchLog.`);

    // 2. Reset punch fields on Schedule lectures
    const schedules = await Schedule.find({});
    let resetLecturesCount = 0;
    for (const sch of schedules) {
      let modified = false;
      (sch.lectures || []).forEach((lec) => {
        if (lec.punchInTime || lec.punchOutTime || lec.punchStatus !== "PENDING" || lec.punchInNotes || lec.punchOutNotes) {
          lec.punchInTime = null;
          lec.punchOutTime = null;
          lec.punchInNotes = "";
          lec.punchOutNotes = "";
          lec.punchInFile = { fileName: "", fileUrl: "" };
          lec.punchOutFile = { fileName: "", fileUrl: "" };
          lec.punchStatus = "PENDING";
          modified = true;
          resetLecturesCount++;
        }
      });
      if (modified) {
        await sch.save();
      }
    }
    console.log(`Reset punch status on ${resetLecturesCount} schedule lectures.`);

    // 3. Reset punch fields on BatchLecture documents
    const resBatchLectures = await BatchLecture.updateMany(
      {},
      {
        $set: {
          punchInTime: null,
          punchOutTime: null,
          punchInNotes: "",
          punchOutNotes: "",
          punchInFile: { fileName: "", fileUrl: "" },
          punchOutFile: { fileName: "", fileUrl: "" },
          punchStatus: "PENDING"
        }
      }
    );
    console.log(`Reset punch status on ${resBatchLectures.modifiedCount} batch lectures.`);

    console.log("\nSuccessfully cleared all Lecture Punch Logs from database!");
    process.exit(0);
  } catch (err) {
    console.error("Error clearing punch logs:", err);
    process.exit(1);
  }
}

clearPunchLogs();
