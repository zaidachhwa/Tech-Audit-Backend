import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
   phone: {
  type: String,
  trim: true,
  default: "",
  set: function (value) {
    if (!value) return value;

    // Agar already +91 hai to as it is return karo
    if (value.startsWith("+91")) return value;

    // Warna +91 add karo
    return `+91${value}`;
  },
},

    subjects: [{ type: String }],

    role: { type: String, default: "teacher" },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Teacher = mongoose.model("Teacher", teacherSchema);
