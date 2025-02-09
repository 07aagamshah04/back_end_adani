const express = require("express");
const { checkLogin, addFaculty } = require("../controllers/admin");

const router = express.Router();

router.route("/login").post(checkLogin);
router.route("/add-faculty").post(addFaculty);
module.exports = router;
