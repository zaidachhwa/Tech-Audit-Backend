const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const Syllabus = mongoose.model('Syllabus', new mongoose.Schema({}, {strict: false}), 'syllabuses');
  const BatchLecture = mongoose.model('BatchLecture', new mongoose.Schema({}, {strict: false}), 'batchlectures');
  const Batch = mongoose.model('Batch', new mongoose.Schema({}, {strict: false}), 'batches');
  
  const subject = 'BACKEND ADVANCED';
  
  const escaped = subject.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subjRegex = new RegExp('^' + escaped + '$', 'i');
  
  const matchedSyllabi = await Syllabus.find({
    $or: [
      { subject: { $regex: subjRegex } },
      { name:    { $regex: subjRegex } },
    ]
  }).lean();
  
  console.log('Matched Syllabi:', matchedSyllabi.map(s => s._id));
  
  if (matchedSyllabi.length > 0) {
    const syllabusIds = matchedSyllabi.map(s => s._id);
    const topics = await BatchLecture.find({
      syllabus: { $in: syllabusIds }
    }).lean();
    
    console.log('Total topics for this syllabus ID across all batches:', topics.length);
    if(topics.length > 0) {
        const uniqueBatches = [...new Set(topics.map(t => String(t.batch)))];
        console.log('Batches that have these topics:', uniqueBatches);
        
        for (const bid of uniqueBatches) {
           const batchInfo = await Batch.findById(bid).lean();
           console.log(`Batch ID ${bid} -> ${batchInfo ? batchInfo.batch_name : 'Unknown'}`);
        }
    }
  }
  process.exit();
}).catch(console.error);
