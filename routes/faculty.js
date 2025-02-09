const express = require("express");
const {
  checkLogin,
  generateQR,
  addAttendance,
  getAttendance,
  updateAttendance,
} = require("../controllers/faculty");

const router = express.Router();

router.route("/login").post(checkLogin);
router.route("/generateQR").post(generateQR);
router.route("/addAttendance").post(addAttendance);
router.route("/getAttendance").post(getAttendance);
router.route("/updateAttendance").post(updateAttendance);
// router.route("/add-faculty").post(addFaculty);
module.exports = router;
