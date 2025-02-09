const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    semClassSubjects: [
      {
        semester: { type: String, required: true },
        className: { type: String, required: true },
        subject: { type: String, required: true },
        uid: { type: String, required: true, unique: true },
      },
    ],
  },
  { timestamps: true }
);

const Faculty = mongoose.model("faculty", facultySchema);

module.exports = Faculty;
