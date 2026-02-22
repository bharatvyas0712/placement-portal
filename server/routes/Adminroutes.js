const router = require("express").Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  loginAdmin,
  getOverview,
  getAllStudents,
  getAllCompanies,
  getAllJobs,
  deleteJob,
  deleteStudent
} = require("../controllers/Admincontroller");

/* Admin-only middleware */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access only" });
  next();
};

router.post("/login",                      loginAdmin);
router.get("/overview",  verifyToken, adminOnly, getOverview);
router.get("/students",  verifyToken, adminOnly, getAllStudents);
router.get("/companies", verifyToken, adminOnly, getAllCompanies);
router.get("/jobs",      verifyToken, adminOnly, getAllJobs);
router.delete("/jobs/:id",     verifyToken, adminOnly, deleteJob);
router.delete("/students/:id", verifyToken, adminOnly, deleteStudent);

module.exports = router;