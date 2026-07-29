import webpush from "web-push";
import PushSubscription from "../models/pushSubscription.model.js";
import Student from "../models/student.model.js";
import dotenv from "dotenv";

dotenv.config();

if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys not set in environment. Push notifications are disabled.");
}

/**
 * Sends a push notification to a specific user (all their devices).
 * @param {string} userId
 * @param {string} userModel - 'Student', 'Teacher', or 'Admin'
 * @param {object} payload - The notification payload (title, body, url, etc.)
 */
export const sendPushToUser = async (userId, userModel, payload) => {
  try {
    const subscriptions = await PushSubscription.find({
      user: userId,
      userModel,
    });

    if (!subscriptions || subscriptions.length === 0) {
      return; // No devices registered for this user
    }

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payloadString);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription has expired or is no longer valid, remove it
          await PushSubscription.findByIdAndDelete(sub._id);
        } else {
          console.error("Error sending push notification to a device:", error);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error in sendPushToUser:", error);
  }
};

/**
 * Sends a push notification to all active students in a specific batch.
 * @param {string} batchName
 * @param {object} payload
 */
export const sendPushToBatch = async (batchName, payload) => {
  try {
    const students = await Student.find({ batch_name: batchName, isActive: true });
    
    if (!students || students.length === 0) return;

    const studentIds = students.map((s) => s._id);

    const subscriptions = await PushSubscription.find({
      user: { $in: studentIds },
      userModel: "Student",
    });

    if (!subscriptions || subscriptions.length === 0) return;

    const payloadString = JSON.stringify(payload);

    const promises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payloadString);
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id);
        }
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error in sendPushToBatch:", error);
  }
};

/**
 * Broadcasts a push notification to multiple teachers.
 * @param {Array<string>} teacherIds
 * @param {object} payload
 */
export const sendPushToTeachers = async (teacherIds, payload) => {
    try {
      const subscriptions = await PushSubscription.find({
        user: { $in: teacherIds },
        userModel: "Teacher",
      });
  
      if (!subscriptions || subscriptions.length === 0) return;
  
      const payloadString = JSON.stringify(payload);
  
      const promises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payloadString);
        } catch (error) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await PushSubscription.findByIdAndDelete(sub._id);
          }
        }
      });
  
      await Promise.all(promises);
    } catch (error) {
      console.error("Error in sendPushToTeachers:", error);
    }
  };
