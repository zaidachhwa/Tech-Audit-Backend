import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Student from "./models/student.model.js";

async function findFarhat() {
  await mongoose.connect(process.env.MONGODB_URL);
  const found = await Student.find({ name: { $regex: /farhat/i } });
  console.log("Farhat records:", found.map(s => ({ _id: s._id, name: s.name, email: s.email })));
  process.exit(0);
}

findFarhat();
