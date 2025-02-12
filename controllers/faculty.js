const Faculty = require("../models/faculty");
const Attendance = require("../models/attendance");
async function checkLogin(req, res) {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, msg: "Email and password are required" });
  }

  try {
    // Check if email exists in the faculty table
    const faculty = await Faculty.findOne({ email });

    if (!faculty) {
      return res
        .status(404)
        .json({ success: false, msg: "Email does not exist in the system" });
    }

    // If email exists but password is not set, add the password
    if (!faculty.password) {
      faculty.password = password;
      await faculty.save();
      return res.status(200).json({
        success: true,
        msg: "Password set successfully. You can now log in.",
      });
    }

    // Validate the password
    if (faculty.password !== password) {
      return res.status(401).json({ success: false, msg: "Invalid password" });
    }

    // Successful login
    return res.status(200).json({
      success: true,
      msg: "Login successful",
      faculty: {
        id: faculty._id,
        email: faculty.email,
        name: faculty.name, // Assuming `name` exists in the Faculty model
      },
    });
  } catch (error) {
    console.error("Error during login check:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
}

async function generateQR(req, res) {
  const { email, semester, className } = req.body;

  // Validate input
  if (!email || !semester || !className) {
    return res.status(400).json({
      success: false,
      msg: "Email, semester, className, and subject are required",
    });
  }

  try {
    // Find the faculty record by email
    const faculty = await Faculty.findOne({ email });

    if (!faculty) {
      return res
        .status(404)
        .json({ success: false, msg: "Faculty email not found in the system" });
    }

    // Check for matching semester and className in semClassSubjects
    const matchingSubject = faculty.semClassSubjects.find(
      (item) => item.semester === semester && item.className === className
    );

    if (!matchingSubject) {
      return res.status(404).json({
        success: false,
        msg: "No matching semester or className found",
      });
    }

    // Get the UID from the matching subject
    const { uid } = matchingSubject;
    const { subject } = matchingSubject;

    // Check or update attendance for the given semester, className, and subject
    const attendanceRecord = await Attendance.findOne({ semester, className });

    if (!attendanceRecord) {
      return res
        .status(404)
        .json({ success: false, msg: "Attendance record not found" });
    }

    // Update or initialize subject attendance for all students
    const currentDate = new Date().toISOString().split("T")[0]; // Get current date in YYYY-MM-DD format
    // console.log(subject);
    attendanceRecord.students.forEach((student) => {
      if (!(student.subjects instanceof Map)) {
        student.subjects = new Map(Object.entries(student.subjects || {}));
      }

      // Initialize subject map if not present
      if (!student.subjects.has(subject)) {
        console.log(`Initializing subject map for ${subject}`);
        student.subjects.set(subject, new Map());
      }

      // Mark attendance
      const subjectAttendance = student.subjects.get(subject);
      if (!subjectAttendance.has(currentDate)) {
        console.log(`Marking ${student.studentName} absent for ${currentDate}`);
        subjectAttendance.set(currentDate, "A");
      }
    });
    attendanceRecord.markModified("students");
    // Save the updated attendance record
    try {
      await attendanceRecord.save();
      console.log("Attendance updated successfully!");
    } catch (error) {
      console.error("Error saving attendance:", error);
    }
    console.log(uid);
    // Send back the UID to the frontend
    return res.status(200).json({
      success: true,
      msg: "QR data generated and attendance updated successfully",
      uid,
    });
  } catch (error) {
    console.error("Error during QR generation:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
}

async function addAttendance(req, res) {
  try {
    const { qrId, qrId1, rollNumber } = req.body;
    console.log("Received request with QR ID:", qrId);
    console.log("Received request with QR ID1:", qrId1);

    // Step 1: Decode and validate the timestamp
    // let decodedTimeStr;
    // try {
    //   decodedTimeStr = Buffer.from(qrId, "base64").toString("utf-8");
    //   console.log("Decoded Time String:", decodedTimeStr);
    // } catch (error) {
    //   console.error("Error decoding time:", error);
    //   return res.status(400).json({ message: "Invalid QR code." });
    // }

    // // Step 2: Convert to number and validate
    // const decodedTime = parseInt(decodedTimeStr, 10);
    // if (isNaN(decodedTime)) {
    //   return res.status(400).json({ message: "Invalid timestamp in QR code." });
    // }

    // const currentTime = Date.now();
    const decodedTimeStr = Buffer.from(qrId, "base64").toString("utf-8");
    const decodedTime = parseInt(decodedTimeStr, 10);
    const currentTime = Date.now();
    console.log("Decoded Time:", decodedTime);
    console.log("Current Time:", currentTime);
    console.log("Time Difference (ms):", currentTime - decodedTime);

    if (currentTime - decodedTime > 150000) {
      return res.status(400).json({ message: "QR code expired." });
    }
    const faculty = await Faculty.findOne({
      semClassSubjects: { $elemMatch: { uid: qrId1 } },
    });
    // console.log(faculty);
    if (!faculty) {
      return res.status(404).json({ message: "Invalid UID." });
    }
    // console.log(faculty);
    // Step 3: Extract semester, className, and subject from the faculty data
    const semClassSubject = faculty.semClassSubjects.find(
      (s) => s.uid === qrId1
    );
    const { semester, className, subject } = semClassSubject;
    // console.log(semester);
    // Step 4: Find the attendance record for the semester and class
    const attendance = await Attendance.findOne({ semester, className });
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    // Step 5: Find the student in the attendance record using rollNumber
    const student = attendance.students.get(rollNumber);
    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found in attendance record." });
    }
    // console.log(student);
    // Step 6: Mark attendance for today's date for the specific subject
    const currentDate = new Date().toISOString().split("T")[0];
    // if (!student.subjects.get(subject)) {
    //     student.subjects.set(subject, {});
    // }
    // console.log(currentDate);
    console.log(student.subjects.get(subject));
    // console.log(student.subjects.get(subject)[currentDate]);
    student.subjects.get(subject).set(currentDate, "P");
    //console.log("Hi");
    attendance.markModified("students");
    // Save the updated attendance record
    await attendance.save();

    // Step 7: Respond with success
    return res.status(200).json({ message: "Attendance marked successfully." });
  } catch (error) {
    console.error("Error in marking attendance:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

async function getAttendance(req, res) {
  const { email, semester, className } = req.body;

  try {
    // Find the faculty
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      return res.status(404).json({ success: false, msg: "Faculty not found" });
    }

    // Get the subjects the faculty teaches for the given semester and class
    const subjects = faculty.semClassSubjects
      .filter((s) => s.semester === semester && s.className === className)
      .map((s) => s.subject);

    if (!subjects.length) {
      return res.status(404).json({
        success: false,
        msg: "No subjects found for the given semester and class",
      });
    }
    const subject = subjects[0];

    // Find attendance record for the given semester and className
    const attendanceRecord = await Attendance.findOne({ semester, className });
    if (!attendanceRecord) {
      return res
        .status(404)
        .json({ success: false, msg: "No attendance data found" });
    }
    // console.log(attendanceRecord);
    // Extract attendance data for the specific subject
    const filteredAttendance = {
      semester: attendanceRecord.semester,
      className: attendanceRecord.className,
      students: {},
    };

    for (const [
      studentId,
      studentData,
    ] of attendanceRecord.students.entries()) {
      if (studentData.subjects.has(subject)) {
        filteredAttendance.students[studentId] = {
          rollNumber: studentData.rollNumber,
          studentName: studentData.studentName,
          usn: studentData.usn,
          attendance: studentData.subjects.get(subject),
        };
      }
    }
    // console.log(filteredAttendance);
    return res.status(200).json({ success: true, data: filteredAttendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
}

async function updateAttendance(req, res) {
  const { email, semester, className, enrollment, date, status } = req.body;
  console.log(`Updating attendance: ${enrollment}, ${date}, Status: ${status}`);

  try {
    // Find the faculty
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      return res.status(404).json({ success: false, msg: "Faculty not found" });
    }

    // Get subjects the faculty teaches for the given semester and class
    const subjects = faculty.semClassSubjects
      .filter((s) => s.semester === semester && s.className === className)
      .map((s) => s.subject);

    if (!subjects.length) {
      return res.status(404).json({
        success: false,
        msg: "No subjects found for the given semester and class",
      });
    }

    const subject = subjects[0];

    // Find attendance record for semester & class
    const attendanceRecord = await Attendance.findOne({ semester, className });
    if (!attendanceRecord) {
      return res
        .status(404)
        .json({ success: false, msg: "Attendance record not found" });
    }

    // ✅ Ensure students Map exists
    if (
      !attendanceRecord.students ||
      !(attendanceRecord.students instanceof Map)
    ) {
      return res
        .status(404)
        .json({ success: false, msg: "Students data not found" });
    }

    // ✅ Ensure student exists in attendance record (Use .get() for Map)
    const student = attendanceRecord.students.get(enrollment);
    if (!student) {
      return res.status(404).json({
        success: false,
        msg: "Student not found in attendance record",
      });
    }

    // ✅ Ensure subjects Map exists for student
    if (!student.subjects || !(student.subjects instanceof Map)) {
      return res
        .status(404)
        .json({ success: false, msg: "Subjects data missing for student" });
    }

    // ✅ Ensure subject exists in student's subjects (Use .get() for Map)
    const subjectAttendance = student.subjects.get(subject);
    console.log(subjectAttendance);
    if (!subjectAttendance) {
      return res.status(404).json({
        success: false,
        msg: `Subject ${subject} not found for student`,
      });
    }

    // ✅ Finally update attendance status (Use .set() for Map)
    subjectAttendance.set(date, status);
    attendanceRecord.markModified("students");
    // ✅ Save updated record
    await attendanceRecord.save();

    res.json({ success: true, msg: "Attendance updated successfully" });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
}

module.exports = {
  checkLogin,
  generateQR,
  addAttendance,
  getAttendance,
  updateAttendance,
};
