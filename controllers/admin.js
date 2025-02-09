const Admin = require("../models/admin");
const Faculty = require("../models/faculty");
const Attendance = require("../models/attendance");
const csvParser = require("csv-parser"); // Ensure csv-parser is installed
const { Readable } = require("stream");

async function checkLogin(req, res) {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, msg: "Email and password are required" });
  }

  try {
    // Fetch admin by email
    const admin = await Admin.findOne({ email });

    // Check if the password matches
    if (admin && admin.password === password) {
      return res.status(200).json({ success: true, msg: "Login successful" });
    }

    return res
      .status(401)
      .json({ success: false, msg: "Invalid email or password" });
  } catch (err) {
    console.error("Error during login:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
}

async function addFaculty(req, res) {
  const { email, semester, className, subject, uid, csv } = req.body;
  console.log(email, semester, className, subject, uid);

  // Validate input
  if (!email || !semester || !className || !subject || !uid) {
    return res
      .status(400)
      .json({ success: false, msg: "All fields are required" });
  }

  try {
    // Check if faculty already exists
    let faculty = await Faculty.findOne({ email });

    if (faculty) {
      faculty.semClassSubjects.push({ semester, className, subject, uid });
      await faculty.save();
    } else {
      faculty = new Faculty({
        email,
        semClassSubjects: [{ semester, className, subject, uid }],
      });
      await faculty.save();
    }

    // Parse CSV
    const stream = Readable.from(csv);
    let students = [];

    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row) => {
          students.push({
            enrollmentNumber: row.Enrollment, // Key
            studentData: {
              rollNumber: row.RollNo,
              studentName: row.Name,
              usn: row.UniversitySeatNumber,
              subjects: new Map([[subject, {}]]), // Map instead of object
            },
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("CSV parsed students:", students);

    // Check if attendance for semester and class exists
    let attendance = await Attendance.findOne({ semester, className });

    if (attendance) {
      console.log("Existing attendance found, updating...");
      students.forEach(({ enrollmentNumber, studentData }) => {
        if (!attendance.students.has(enrollmentNumber)) {
          console.log(`Adding new student: ${enrollmentNumber}`);
          attendance.students.set(enrollmentNumber, studentData);
        } else {
          console.log(`Updating student: ${enrollmentNumber}`);
          let existingStudent = attendance.students.get(enrollmentNumber);

          // Ensure subjects is a Map
          if (!(existingStudent.subjects instanceof Map)) {
            existingStudent.subjects = new Map(
              Object.entries(existingStudent.subjects)
            );
          }

          if (!existingStudent.subjects.has(subject)) {
            existingStudent.subjects.set(subject, {});
            console.log(
              `Added subject ${subject} for student ${enrollmentNumber}`
            );
          }

          attendance.students.set(enrollmentNumber, existingStudent);
        }
      });

      // Mark attendance.students as modified before saving
      attendance.markModified("students");
    } else {
      console.log("No existing attendance, creating new entry...");
      let studentMap = new Map();
      students.forEach(({ enrollmentNumber, studentData }) => {
        studentMap.set(enrollmentNumber, studentData);
      });

      attendance = new Attendance({
        semester,
        className,
        students: studentMap,
      });
    }

    // Ensure saving attendance completes
    await attendance.save();
    console.log("Attendance saved successfully!");

    return res.status(200).json({ success: true, msg: "Attendance updated" });
  } catch (err) {
    console.error("Error adding faculty:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
}

module.exports = { checkLogin, addFaculty };
