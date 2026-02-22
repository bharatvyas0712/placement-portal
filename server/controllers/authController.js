const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("❌ JWT_SECRET is not set in .env!");

/* ─── Email Transporter ─── */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 587, secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

const sendStudentWelcome = (toEmail, name) => {
  transporter.sendMail({
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🎉 Welcome to Placement Portal, ${name}!`,
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#7c6fcd,#e8ff47);height:4px;"></div>
      <div style="padding:36px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🎓</div>
        <h1 style="font-size:24px;font-weight:800;margin:0 0 8px;color:#fff;">Welcome, ${name}!</h1>
        <p style="color:#9898b0;font-size:14px;margin:0 0 24px;">Your profile has been registered successfully on Placement Portal.</p>
        <div style="background:#13131f;border:1px solid rgba(29,209,161,0.2);border-radius:14px;padding:20px;margin-bottom:24px;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:16px;font-weight:700;color:#1dd1a1;margin-bottom:4px;">Registration Successful!</div>
          <div style="font-size:13px;color:#9898b0;">You can now login and start exploring job opportunities.</div>
        </div>
        <a href="http://localhost:3000/login" style="display:inline-block;background:#7c6fcd;color:#fff;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;text-decoration:none;">Login to Your Account →</a>
      </div>
    </div>`
  }, (err) => { if (err) console.error("Welcome email error:", err.message); else console.log(`✅ Welcome email → ${toEmail}`); });
};

const sendCompanyWelcome = (toEmail, companyName) => {
  transporter.sendMail({
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🏢 Welcome to Placement Portal — ${companyName}!`,
    html: `<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#e8ff47,#a8ff78);height:4px;"></div>
      <div style="padding:36px 32px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🏢</div>
        <h1 style="font-size:24px;font-weight:800;margin:0 0 8px;color:#fff;">Welcome, ${companyName}!</h1>
        <p style="color:#9898b0;font-size:14px;margin:0 0 24px;">Your company profile has been registered successfully.</p>
        <div style="background:#13131f;border:1px solid rgba(29,209,161,0.2);border-radius:14px;padding:20px;margin-bottom:24px;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:16px;font-weight:700;color:#1dd1a1;margin-bottom:4px;">Registration Successful!</div>
        </div>
        <a href="http://localhost:3000/company-login" style="display:inline-block;background:#e8ff47;color:#0d0d14;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;text-decoration:none;">Login to Company Portal →</a>
      </div>
    </div>`
  }, (err) => { if (err) console.error("Company welcome email error:", err.message); else console.log(`✅ Welcome email → ${toEmail}`); });
};

/* ================= STUDENT REGISTER ================= */
exports.registerStudent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { name, email, password, phone } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 12);
    db.query("INSERT INTO students (name,email,password,phone) VALUES (?,?,?,?)",
      [name.trim(), email.toLowerCase(), hashed, phone],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already registered" });
          return res.status(500).json({ message: "Error registering student" });
        }
        sendStudentWelcome(email.toLowerCase(), name.trim());
        res.json({ message: "Student Registered Successfully" });
      });
  } catch { res.status(500).json({ message: "Server error" }); }
};

/* ================= STUDENT LOGIN ================= */
exports.loginStudent = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { email, password } = req.body;
  db.query("SELECT * FROM students WHERE email = ?", [email.toLowerCase()], async (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!result.length) return res.status(404).json({ message: "No account found with this email" });
    const user = result[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });
    const token = jwt.sign({ id: user.id, role: "student" }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ message: "Login successful", token, name: user.name });
  });
};

/* ================= COMPANY REGISTER ================= */
exports.registerCompany = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { company_name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 12);
    db.query("INSERT INTO companies (company_name,email,password) VALUES (?,?,?)",
      [company_name.trim(), email.toLowerCase(), hashed],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already registered" });
          return res.status(500).json({ message: "Error registering company" });
        }
        sendCompanyWelcome(email.toLowerCase(), company_name.trim());
        res.json({ message: "Company Registered Successfully" });
      });
  } catch { res.status(500).json({ message: "Server error" }); }
};

/* ================= COMPANY LOGIN ================= */
exports.loginCompany = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const { email, password } = req.body;
  db.query("SELECT * FROM companies WHERE email = ?", [email.toLowerCase()], async (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!result.length) return res.status(404).json({ message: "No company found with this email" });
    const company = result[0];
    const valid = await bcrypt.compare(password, company.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });
    const token = jwt.sign({ id: company.id, role: "company" }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ message: "Login successful", token, company_name: company.company_name });
  });
};

/* ================= GET FULL PROFILE ================= */
exports.getProfile = (req, res) => {
  const sql = `
    SELECT
      s.name, s.email, s.phone, s.resume, s.dob, s.gender,
      s.degree, s.branch, s.college, s.year_of_pass,
      s.tenth_percent, s.twelth_percent, s.cgpa, s.backlogs,
      s.father_name, s.father_phone, s.father_occup,
      s.mother_name, s.mother_phone, s.mother_occup,
      s.address, s.city, s.state,
      s.linkedin, s.github, s.skills,
      COUNT(a.id)                                    AS totalApplications,
      SUM(a.status = 'Approved')                     AS approved,
      SUM(a.status = 'Pending' OR a.status IS NULL)  AS pending,
      SUM(a.status = 'Rejected')                     AS rejected
    FROM students s
    LEFT JOIN applications a ON s.id = a.student_id
    WHERE s.id = ?
    GROUP BY s.id
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching profile" });
    if (!result.length) return res.status(404).json({ message: "Student not found" });
    res.json(result[0]);
  });
};

/* ================= UPDATE FULL PROFILE ================= */
exports.updateProfile = (req, res) => {
  const {
    name, phone, dob, gender,
    degree, branch, college, year_of_pass,
    tenth_percent, twelth_percent, cgpa, backlogs,
    father_name, father_phone, father_occup,
    mother_name, mother_phone, mother_occup,
    address, city, state,
    linkedin, github, skills
  } = req.body;

  if (!name || !phone) return res.status(400).json({ message: "Name and phone are required" });

  const sql = `
    UPDATE students SET
      name=?, phone=?, dob=?, gender=?,
      degree=?, branch=?, college=?, year_of_pass=?,
      tenth_percent=?, twelth_percent=?, cgpa=?, backlogs=?,
      father_name=?, father_phone=?, father_occup=?,
      mother_name=?, mother_phone=?, mother_occup=?,
      address=?, city=?, state=?,
      linkedin=?, github=?, skills=?
    WHERE id=?
  `;

  db.query(sql, [
    name.trim(), phone.trim(), dob || null, gender || null,
    degree || null, branch || null, college || null, year_of_pass || null,
    tenth_percent || null, twelth_percent || null, cgpa || null, backlogs ? 1 : 0,
    father_name || null, father_phone || null, father_occup || null,
    mother_name || null, mother_phone || null, mother_occup || null,
    address || null, city || null, state || null,
    linkedin || null, github || null, skills || null,
    req.user.id
  ], (err) => {
    if (err) return res.status(500).json({ message: "Error updating profile" });
    res.json({ message: "Profile updated successfully", name: name.trim() });
  });
};