const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });
mongoose.connect(process.env.MONGODB_URL).then(async () => {
  const Student = mongoose.model('Student', new mongoose.Schema({
    email: String
  }, { strict: false }));
  const student = await Student.findOne();
  if (student) {
    console.log('Original email in DB:', student.email);
    const token = jwt.sign({ id: '6481', role: 'admin' }, process.env.JWT_SECRET);
    const newEmail = 'testemail_' + Date.now() + '@test.com';
    const res = await fetch('http://127.0.0.1:5006/api/students/update/' + student._id, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail })
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
    
    // verify in db
    const updated = await Student.findById(student._id);
    console.log('New email in DB:', updated.email);
    
    // revert
    await fetch('http://127.0.0.1:5006/api/students/update/' + student._id, {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student.email })
    });
  }
  process.exit(0);
});
