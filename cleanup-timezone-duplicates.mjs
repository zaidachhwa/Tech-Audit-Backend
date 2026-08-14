import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const db = mongoose.connection.db;
  const docs = await db.collection('studentattendances').find({}).sort({ punchInTime: 1 }).toArray();
  const seen = {};
  let deleted = 0;
  for (const doc of docs) {
    const isoStr = doc.date.toISOString();
    let yyyy_mm_dd;
    if (isoStr.endsWith('T18:30:00.000Z')) {
      const d = new Date(doc.date.getTime() + 5.5 * 3600 * 1000);
      yyyy_mm_dd = d.toISOString().split('T')[0];
    } else {
      yyyy_mm_dd = isoStr.split('T')[0];
    }
    
    const key = doc.student.toString() + '_' + yyyy_mm_dd;
    if (!seen[key]) {
      seen[key] = doc;
      await db.collection('studentattendances').updateOne(
        { _id: doc._id },
        { $set: { date: new Date(yyyy_mm_dd + 'T00:00:00.000Z') } }
      );
    } else {
      console.log('Deleting duplicate:', doc._id, 'for key', key);
      await db.collection('studentattendances').deleteOne({ _id: doc._id });
      deleted++;
    }
  }
  console.log('Fixed dates and deleted duplicates:', deleted);
  process.exit(0);
});
