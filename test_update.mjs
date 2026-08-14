const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const Student = mongoose.model('Student', new mongoose.Schema({
    email: String
  }));
  const student = await Student.findOne();
  if (student) {
    console.log('Found student:', student._id, student.email);
    const token = require('jsonwebtoken').sign({ id: '6481', role: 'admin' }, process.env.JWT_SECRET);
    const res = await fetch('http://localhost:5006/api/students/update/' + student._id, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newemail_' + Date.now() + '@test.com' })
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
    
    // verify in db
    const updated = await Student.findById(student._id);
    console.log('Updated email in DB:', updated.email);
  }
  process.exit(0);
});
