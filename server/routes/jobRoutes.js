const router = require("express").Router();
const { createJob, getJobs, toggleJobStatus, getCompanyJobs } = require("../controllers/jobController");
const verifyToken = require("../middleware/authMiddleware");

router.post("/",        verifyToken, createJob);       // company posts job
router.get("/",                      getJobs);          // students view jobs (paginated)
router.get("/mine",     verifyToken, getCompanyJobs);  // company views their own jobs
router.put("/toggle",   verifyToken, toggleJobStatus); // company opens/closes job

module.exports = router;