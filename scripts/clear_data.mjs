import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function clearData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB.');

    const Homework = mongoose.model('Homework', new mongoose.Schema({}, { strict: false }), 'homeworks');
    const Submission = mongoose.model('Submission', new mongoose.Schema({}, { strict: false }), 'submissions');
    const Project = mongoose.model('Project', new mongoose.Schema({}, { strict: false }), 'projects');
    const LMS = mongoose.model('LMS', new mongoose.Schema({}, { strict: false }), 'lms');
    const Announcement = mongoose.model('Announcement', new mongoose.Schema({}, { strict: false }), 'announcements');
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, { strict: false }), 'schedules');

    // Delete documents
    const hwRes = await Homework.deleteMany({});
    console.log(`Deleted ${hwRes.deletedCount} documents from Homework collection.`);

    const subRes = await Submission.deleteMany({});
    console.log(`Deleted ${subRes.deletedCount} documents from Submission collection.`);

    const projRes = await Project.deleteMany({});
    console.log(`Deleted ${projRes.deletedCount} documents from Project collection.`);

    const lmsRes = await LMS.deleteMany({});
    console.log(`Deleted ${lmsRes.deletedCount} documents from LMS collection.`);

    const annRes = await Announcement.deleteMany({});
    console.log(`Deleted ${annRes.deletedCount} documents from Announcement collection.`);

    // Reset homework field on schedule lectures
    const schedRes = await Schedule.updateMany(
      { "lectures.homework": { $exists: true } },
      { $set: { "lectures.$[].homework": { title: "", description: "", due_date: null, accept_submissions: true } } }
    );
    console.log(`Reset lecture homework in ${schedRes.modifiedCount} Schedule documents.`);

    console.log('--- CLEANUP COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

clearData();
