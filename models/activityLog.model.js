import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "onModel"
    },
    onModel: {
      type: String,
      enum: ["Admin", "Teacher", "Student"]
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: ""
    },
    ipAddress: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
