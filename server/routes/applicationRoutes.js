const router = require("express").Router();
const { body } = require("express-validator");
const {
  applyJob,
  getStudentApplications,
  getStats,
  uploadResume,
  getJobApplicants,
  updateApplicationStatus,
  createJob
} = require("../controllers/applicationController");

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const jobPostRules = [
  body("title").trim().notEmpty().withMessage("Job title is required"),
  body("description").trim().notEmpty().withMessage("Job description is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("salary").trim().notEmpty().withMessage("Salary is required"),
];

router.post("/",               verifyToken, applyJob);
router.get("/student",         verifyToken, getStudentApplications);
router.get("/stats",           verifyToken, getStats);
router.post("/upload-resume",  verifyToken, upload.single("resume"), uploadResume);
router.get("/company",         verifyToken, getJobApplicants);
router.put("/status",          verifyToken, updateApplicationStatus);
router.post("/jobs",           verifyToken, jobPostRules, createJob);

module.exports = router;