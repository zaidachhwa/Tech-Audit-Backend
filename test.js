import mongoose from 'mongoose';
import Schedule from './models/schedule.model.js';
mongoose.connect('mongodb://localhost:27017/tech_audit_db').then(async () => {
  const schs = await Schedule.find({}).lean();
  console.log('Total schedules:', schs.length);
  schs.slice(0, 5).forEach(s => {
    console.log('Subject:', s.subject);
    s.lectures?.slice(0, 2).forEach(l => {
      console.log('  - Date:', l.date);
    });
  });
  mongoose.disconnect();
}).catch(console.error);
