const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema({
  semester: { type: String, required: true },
  className: { type: String, required: true },
  students: {
    type: Map,
    of: new mongoose.Schema(
      {
        rollNumber: { type: String, required: true },
        studentName: { type: String, required: true },
        usn: { type: String, required: true },
        subjects: {
          type: Map,
          of: {
            type: Map,
            of: { type: String, enum: ["A", "P"], default: "A" }, // Date key: "A" or "P"
          },
        },
      },
      { _id: false } // Disable automatic `_id` field
    ),
  },
});

// Define the unique constraint for semester and className
AttendanceSchema.index({ semester: 1, className: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", AttendanceSchema);

module.exports = Attendance;
