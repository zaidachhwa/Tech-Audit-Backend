import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    profilePhoto: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: {
      type: String,
      trim: true,
      default: "",
      set: function (value) {
        if (!value) return value;

        if (value.startsWith("+91")) return value;

        return `+91${value}`;
      },
    },

    subjects: [{ type: String }],
    location: { type: String, default: "" },
    bio: { type: String, default: "" },

    role: { type: String, default: "teacher" },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
