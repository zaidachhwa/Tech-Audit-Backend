import bcrypt from "bcryptjs";
import { Student } from "../models/student.model.js";
import Batch from "../models/batch.model.js";
import Settings from "../models/settings.model.js";
import { sendStudentCredentials, generateRandomPassword } from "../utils/email.js";

/**
 * Robust CSV parser that handles double quotes, carriage returns, commas,
 * and multi-line fields inside quotes.
 */
const parseCSV = (csvText) => {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }

  // Add the last row if it's not empty
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  return lines;
};

/**
 * Controller to handle Bulk Student CSV Import
 */
export const bulkImportStudents = async (req, res) => {
  try {
    const { batch_name, batch_no, csvData } = req.body;

    // 1. Basic validation
    if (!batch_name || !batch_no) {
      return res.status(400).json({ message: "Course (batch_name) and Batch (batch_no) are required." });
    }

    if (!csvData) {
      return res.status(400).json({ message: "CSV data is required." });
    }

    // 2. Validate selected Course/Batch exists
    const batch = await Batch.findOne({ batch_name, batch_no });
    if (!batch) {
      return res.status(404).json({ message: `The selected Course "${batch_name}" and Batch "${batch_no}" was not found.` });
    }

    // 3. Parse CSV
    const parsedLines = parseCSV(csvData);
    if (parsedLines.length <= 1) {
      return res.status(400).json({ message: "The CSV file must contain a header row and at least one student record." });
    }

    // 4. Normalize and map headers
    const rawHeaders = parsedLines[0];
    const headers = rawHeaders.map(h => h.trim().toLowerCase());

    const nameIndex = headers.indexOf("name");
    const emailIndex = headers.indexOf("email");
    const phoneIndex = headers.indexOf("phone");

    if (nameIndex === -1 || emailIndex === -1) {
      return res.status(400).json({
        message: "Invalid CSV headers. The CSV must contain headers for 'name' and 'email'."
      });
    }

    // Fetch custom fields schema
    const setting = await Settings.findOne({ key: "student_custom_fields" });
    const customFieldsSchema = setting?.value || [];
    
    // Map custom fields to CSV column indexes
    const customFieldIndexes = {};
    customFieldsSchema.forEach(field => {
      const colName = field.name.toLowerCase();
      const idx = headers.indexOf(colName);
      if (idx !== -1) {
        customFieldIndexes[field.name] = idx;
      }
    });

    // 5. Pre-fetch existing emails and phones from DB for O(1) checks
    const existingStudents = await Student.find({}, "email phoneNo").lean();
    const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase()));
    const existingPhones = new Set(existingStudents.map(s => s.phoneNo).filter(Boolean));

    // Sets to prevent duplicate entries inside the CSV file itself
    const csvEmails = new Set();
    const csvPhones = new Set();

    const errors = [];
    const validStudents = [];
    const passwordsToEmail = [];
    let successCount = 0;
    let failedCount = 0;

    // 6. Validate row-by-row
    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      const rowNum = i + 1;

      // Skip completely empty lines
      if (row.length === 0 || (row.length === 1 && row[0].trim() === "")) {
        continue;
      }

      const name = row[nameIndex]?.trim() || "";
      const email = row[emailIndex]?.trim() || "";
      const phone = phoneIndex !== -1 ? (row[phoneIndex]?.trim() || "") : "";

      // Name and Email are mandatory
      if (!name || !email) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Missing required fields. Name and email are mandatory.`
        });
        continue;
      }

      // Check required custom fields
      let missingCustomField = false;
      const studentCustomFields = {};
      
      for (const field of customFieldsSchema) {
        const idx = customFieldIndexes[field.name];
        const val = idx !== undefined && idx !== -1 ? (row[idx]?.trim() || "") : "";
        
        if (field.isRequired && !val) {
          failedCount++;
          errors.push({
            row: rowNum,
            reason: `Missing required custom field: "${field.name}"`
          });
          missingCustomField = true;
          break;
        }
        studentCustomFields[field.name] = val;
      }

      if (missingCustomField) continue;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Invalid email format: "${email}"`
        });
        continue;
      }

      const emailLower = email.toLowerCase();

      // Check duplicates inside the current CSV file
      if (csvEmails.has(emailLower)) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Duplicate email inside the CSV file: "${email}"`
        });
        continue;
      }

      if (phone && csvPhones.has(phone)) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Duplicate phone number inside the CSV file: "${phone}"`
        });
        continue;
      }

      // Check duplicates against existing database records
      if (existingEmails.has(emailLower)) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Duplicate email: Student with email "${email}" is already registered.`
        });
        continue;
      }

      if (phone && existingPhones.has(phone)) {
        failedCount++;
        errors.push({
          row: rowNum,
          reason: `Duplicate phone number: Student with phone "${phone}" is already registered.`
        });
        continue;
      }

      // Add to CSV Sets for file-level uniqueness
      csvEmails.add(emailLower);
      if (phone) {
        csvPhones.add(phone);
      }

      // Generate a unique password for each student and hash it
      const rawPassword = generateRandomPassword();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // Store in valid students list
      validStudents.push({
        name,
        email,
        phoneNo: phone,
        password: hashedPassword,
        batch_name,
        batch_no,
        customFields: studentCustomFields,
        isActive: true // Automatically approved when added by admin
      });

      // Keep track of credentials to email
      passwordsToEmail.push({
        email,
        name,
        password: rawPassword
      });
    }

    // 7. Bulk Insert valid students
    if (validStudents.length > 0) {
      const insertedStudents = await Student.insertMany(validStudents);
      successCount = insertedStudents.length;

      // 8. Associate inserted students to the Batch document
      const insertedIds = insertedStudents.map(s => s._id);
      await Batch.updateOne(
        { _id: batch._id },
        { $addToSet: { students: { $each: insertedIds } } }
      );

      // 9. Send email notifications to students
      for (const item of passwordsToEmail) {
        await sendStudentCredentials(item.email, item.name, item.password);
      }
    }

    // 10. Send detailed output response
    return res.status(200).json({
      successCount,
      failedCount,
      errors
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
