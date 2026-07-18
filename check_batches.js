import mongoose from "mongoose";
import dotenv from "dotenv";
import Batch from "./models/batch.model.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URL);
  const count = await Batch.countDocuments();
  const batches = await Batch.find().select("batch_name batch_no").lean();
  console.log(`Total batches: ${count}`);
  batches.forEach(b => console.log(`  - ${b.batch_name} #${b.batch_no} (${b._id})`));
  await mongoose.disconnect();
}
run().catch(console.error);
