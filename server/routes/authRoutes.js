const router = require("express").Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const {
  registerStudent, loginStudent,
  registerCompany, loginCompany,
  getProfile, updateProfile
} = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true, legacyHeaders: false,
});

const studentRegisterRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2 }),
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("phone").isMobilePhone().withMessage("Enter a valid phone number"),
];

const loginRules = [
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const companyRegisterRules = [
  body("company_name").trim().notEmpty().withMessage("Company name is required"),
  body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

router.post("/register",         authLimiter, studentRegisterRules, registerStudent);
router.post("/login",            authLimiter, loginRules,           loginStudent);
router.post("/company-register", authLimiter, companyRegisterRules, registerCompany);
router.post("/company-login",    authLimiter, loginRules,           loginCompany);
router.get("/profile",           verifyToken, getProfile);
router.put("/profile",           verifyToken, updateProfile);   // ← new

module.exports = router;