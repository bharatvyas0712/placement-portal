require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/Adminroutes.js");
const helpRoutes = require("./routes/helpRoutes");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/help", helpRoutes);
app.use("/uploads", express.static("uploads"));
app.listen(process.env.PORT, () => {
  console.log("Server running on port 5000");
});