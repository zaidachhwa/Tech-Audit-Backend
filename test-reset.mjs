import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Student } from './models/student.model.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to DB");

  const email = "testreset2@example.com";
  await Student.deleteOne({ email });

  const hashed = await bcrypt.hash("oldpassword", 10);
  const student = await Student.create({
    name: "Test Reset",
    email,
    password: hashed,
    batch_name: "Test Batch",
    batch_no: "1",
    isActive: true,
    resetPasswordOtp: "123456",
    resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000)
  });
  console.log("Created student:", student._id);

  // simulate reset password exactly like auth.controller
  student.password = await bcrypt.hash("newpassword", 10);
  student.resetPasswordOtp = "";
  student.resetPasswordExpires = null;
  await student.save();
  console.log("Reset password and saved student");

  // simulate login exactly like student.controller
  const fetchedStudent = await Student.findOne({ email });
  const isMatch = await bcrypt.compare("newpassword", fetchedStudent.password);
  console.log("Login with newpassword match:", isMatch);
  
  const isMatchOld = await bcrypt.compare("oldpassword", fetchedStudent.password);
  console.log("Login with oldpassword match:", isMatchOld);

  await mongoose.disconnect();
}

test().catch(console.error);
