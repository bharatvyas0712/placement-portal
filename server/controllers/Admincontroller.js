const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

/* ================= ADMIN LOGIN ================= */

exports.loginAdmin = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  db.query("SELECT * FROM admins WHERE email = ?", [email.toLowerCase()], async (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (result.length === 0) return res.status(404).json({ message: "Admin not found" });

    const admin = result[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign({ id: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ message: "Admin login successful", token, name: admin.name });
  });
};

/* ================= GET OVERVIEW STATS ================= */

exports.getOverview = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM students)                                        AS totalStudents,
      (SELECT COUNT(*) FROM companies)                                       AS totalCompanies,
      (SELECT COUNT(*) FROM jobs)                                            AS totalJobs,
      (SELECT COUNT(*) FROM applications)                                    AS totalApplications,
      (SELECT COUNT(*) FROM applications WHERE status = 'Approved')         AS approved,
      (SELECT COUNT(*) FROM applications WHERE status = 'Rejected')         AS rejected,
      (SELECT COUNT(*) FROM applications WHERE status = 'Pending')          AS pending
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching stats" });
    res.json(result[0]);
  });
};

/* ================= GET ALL STUDENTS ================= */

exports.getAllStudents = (req, res) => {
  const sql = `
    SELECT
      s.id, s.name, s.email, s.phone,
      s.resume,
      COUNT(a.id) AS applicationCount
    FROM students s
    LEFT JOIN applications a ON s.id = a.student_id
    GROUP BY s.id
    ORDER BY s.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching students" });
    res.json(result);
  });
};

/* ================= GET ALL COMPANIES ================= */

exports.getAllCompanies = (req, res) => {
  const sql = `
    SELECT
      c.id, c.company_name, c.email,
      COUNT(j.id) AS jobsPosted
    FROM companies c
    LEFT JOIN jobs j ON c.id = j.company_id
    GROUP BY c.id
    ORDER BY c.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching companies" });
    res.json(result);
  });
};

/* ================= GET ALL JOBS ================= */

exports.getAllJobs = (req, res) => {
  const sql = `
    SELECT
      j.id, j.title, j.location, j.salary, j.job_type, j.batch,
      c.company_name,
      COUNT(a.id) AS applicantCount
    FROM jobs j
    JOIN companies c ON j.company_id = c.id
    LEFT JOIN applications a ON j.id = a.job_id
    GROUP BY j.id
    ORDER BY j.id DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching jobs" });
    res.json(result);
  });
};

/* ================= DELETE JOB ================= */

exports.deleteJob = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM jobs WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Error deleting job" });
    res.json({ message: "Job deleted successfully" });
  });
};

/* ================= DELETE STUDENT ================= */

exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM students WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Error deleting student" });
    res.json({ message: "Student deleted successfully" });
  });
};