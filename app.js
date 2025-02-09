const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");

const MONGO_URL = process.env.MONGO_URL; // Fetch MongoDB URL from Render
const PORT = process.env.PORT || 5000; // Use Render's assigned port or default to 5000

app.use(cookieParser());
app.use(cors());
app.use(express.json());

const { ConnectMongoDB } = require("./connection");

const Admin = require("./routes/admin");
const Faculty = require("./routes/faculty");

// Connect to MongoDB
ConnectMongoDB(MONGO_URL)
  .then(() => {
    console.log("DATABASE CONNECTED SUCCESSFULLY");
  })
  .catch((error) => {
    console.log("mongoose error", error);
  });

app.use("/api/admin", Admin);
app.use("/api/faculty", Faculty);

app.listen(PORT, () => {
  console.log(`SERVER STARTED AT ${PORT}`);
});
