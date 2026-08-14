import cron from "node-cron";
import Homework from "../models/homework.model.js";
import Project from "../models/project.model.js";
import { Schedule } from "../models/schedule.model.js";
import { BatchLecture } from "../models/batchLecture.model.js";
import { Student } from "../models/student.model.js";
import { StudentAttendance } from "../models/studentAttendance.model.js";
import { sendPushToBatch, sendPushToUser } from "./pushNotification.service.js";
import { notifyParents } from "./parentNotification.service.js";

function parseTimeSlot(timeSlot) {
  if (!timeSlot) return null;
  const cleaned = timeSlot.replace(/\s*[-–—to]+\s*/gi, " - ").trim();
  const rangeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (rangeMatch) {
    let [, sh, sm, sap] = rangeMatch;
    let startH = parseInt(sh), startM = parseInt(sm);
    if (sap) {
      if (sap.toUpperCase() === "PM" && startH !== 12) startH += 12;
      if (sap.toUpperCase() === "AM" && startH === 12) startH = 0;
    }
    return { startHour: startH, startMin: startM };
  }
  const singleMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (singleMatch) {
    let [, h, m, ap] = singleMatch;
    let hour = parseInt(h), min = parseInt(m);
    if (ap) {
      if (ap.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (ap.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    return { startHour: hour, startMin: min };
  }
  return null;
}

export const initCronJobs = () => {
  // Check for Upcoming Lectures (every 5 minutes)
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const targetTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
      
      const dayStart = new Date(targetTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetTime);
      dayEnd.setHours(23, 59, 59, 999);

      // Find schedules (lectures) for today
      const upcomingSchedules = await Schedule.find({
        "lectures.date": { $gte: dayStart, $lte: dayEnd },
      }).populate("batch");

      for (const schedule of upcomingSchedules) {
        for (const lecture of schedule.lectures) {
          if (!lecture.date || !lecture.time_slot) continue;
          
          const lecDate = new Date(lecture.date);
          if (lecDate >= dayStart && lecDate <= dayEnd) {
             const parsed = parseTimeSlot(lecture.time_slot);
             if (parsed) {
                const lecStartTime = new Date(lecDate.getFullYear(), lecDate.getMonth(), lecDate.getDate(), parsed.startHour, parsed.startMin, 0);
                
                // Check if lecture starts between 25 and 30 minutes from now
                const diffMins = (lecStartTime.getTime() - now.getTime()) / 60000;
                if (diffMins > 25 && diffMins <= 30) {
                  const title = "Upcoming Lecture";
                  const body = `Lecture for ${schedule.subject || "subject"} is starting in 30 minutes.`;
                  
                  // Notify Teacher
                  const teacherId = lecture.teacher || schedule.teacher;
                  if (teacherId) {
                     await sendPushToUser(teacherId, "Teacher", { title, body, url: "/teacher/schedule" });
                  }
                  
                  // Notify Students in Batch
                  if (schedule.batch) {
                      await sendPushToBatch(schedule.batch.batch_name, { title, body, url: "/student/dashboard" });
                  }
                }
             }
          }
        }
      }
      
      // Find BatchLectures for today
      const batchLectures = await BatchLecture.find({
        dueDate: { $gte: dayStart, $lte: dayEnd },
      }).populate("batch").populate("syllabus");
      
      for (const bl of batchLectures) {
         if (!bl.dueDate || !bl.remarks) continue; // remarks acts as time_slot
         const parsed = parseTimeSlot(bl.remarks);
         if (parsed) {
            const blDate = new Date(bl.dueDate);
            const lecStartTime = new Date(blDate.getFullYear(), blDate.getMonth(), blDate.getDate(), parsed.startHour, parsed.startMin, 0);
            
            const diffMins = (lecStartTime.getTime() - now.getTime()) / 60000;
            if (diffMins > 25 && diffMins <= 30) {
                const title = "Upcoming Lecture";
                const body = `Lecture for ${bl.syllabus?.subject || bl.title || "subject"} is starting in 30 minutes.`;
                
                if (bl.assignedTo) {
                   await sendPushToUser(bl.assignedTo, "Teacher", { title, body, url: "/teacher/schedule" });
                }
                
                if (bl.batch) {
                    await sendPushToBatch(bl.batch.batch_name, { title, body, url: "/student/dashboard" });
                }
            }
         }
      }
      
    } catch (error) {
      console.error("Error in upcoming lecture cron:", error);
    }
  });

  // Check for Homework Due in < 3 Hours (run hourly)
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const next3Hours = new Date(now.getTime() + 3 * 60 * 60000);

      const dueHomeworks = await Homework.find({
        dueDate: {
          $gte: now,
          $lte: next3Hours,
        },
      });

      const parentNotifs = [];
      const studentIds = [];

      for (const hw of dueHomeworks) {
        if (hw.student) {
          studentIds.push(hw.student);
        }
        if (hw.batchName) {
          await sendPushToBatch(hw.batchName, {
            title: "Homework Due Soon",
            body: `Your homework "${hw.title}" is due in less than 3 hours!`,
            url: `/student/homework`
          });
        }
      }
      
      if (studentIds.length > 0) {
        await notifyParents(studentIds, "Homework Due Soon", "A homework assignment is due in less than 3 hours.");
      }
    } catch (error) {
      console.error("Error in homework due cron:", error);
    }
  });

  // Check for Project Due in 1 Day (run daily at 9:00 AM)
  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60000);

      const dueProjects = await Project.find({
        dueDate: {
          $gte: now,
          $lte: next24Hours,
        },
      }).populate('batch');

      const studentIds = [];

      for (const project of dueProjects) {
        if (project.assignedTo) {
          studentIds.push(project.assignedTo);
        }
        if (project.batch && project.batch.batch_name) {
          await sendPushToBatch(project.batch.batch_name, {
            title: "Project Due Tomorrow",
            body: `Your project "${project.title}" is due tomorrow!`,
            url: `/student/projects`
          });
        }
      }
      
      if (studentIds.length > 0) {
        await notifyParents(studentIds, "Project Due Tomorrow", "A project assignment is due tomorrow.");
      }
    } catch (error) {
      console.error("Error in project due cron:", error);
    }
  });

  // Check for Absent Students (run daily at 5:00 PM)
  cron.schedule("0 17 * * *", async () => {
    try {
      const today = new Date();
      const istStr = today.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
      const dateKey = new Date(`${istStr}T00:00:00.000Z`);
      
      const allStudents = await Student.find({ role: "student" });
      if (!allStudents || allStudents.length === 0) return;
      
      const presentRecords = await StudentAttendance.find({
        date: dateKey,
        punchInTime: { $ne: null }
      });
      
      const presentStudentIds = presentRecords.map(r => r.student.toString());
      
      const absentStudentIds = allStudents
        .filter(s => !presentStudentIds.includes(s._id.toString()))
        .map(s => s._id);
        
      if (absentStudentIds.length > 0) {
        await notifyParents(
          absentStudentIds,
          "Daily Attendance Alert: Absent",
          `This is an automated alert. Your child was marked as ABSENT today (${today.toDateString()}) as they did not punch in at the institute.`
        );
      }
    } catch (error) {
      console.error("Error in absent check cron:", error);
    }
  });
};
