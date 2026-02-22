const db = require("../config/db");
const nodemailer = require("nodemailer");
const { createJobNotification } = require("./notificationController");

/* ─── Email Transporter ─── */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

transporter.verify((err) => {
  if (err) console.error("❌ Email transporter ERROR:", err.message);
  else     console.log("✅ Email transporter ready");
});

/* ─── Send Job Alert to ALL Students ─── */
const sendJobAlertToAllStudents = (jobTitle, companyName, location, salary, jobType, batch, description, lastDate) => {
  console.log(`📌 Job "${jobTitle}" posted by ${companyName}. Sending emails...`);

  db.query("SELECT name, email FROM students WHERE email IS NOT NULL AND email != ''", (err, students) => {
    if (err) { console.error("❌ DB error:", err.message); return; }
    if (!students || students.length === 0) { console.log("⚠ No students to notify."); return; }

    console.log(`📨 Sending job alert to ${students.length} student(s)...`);

    const descSnippet = description && description.length > 200
      ? description.substring(0, 200) + "…"
      : description || "";

    const deadlineStr = lastDate
      ? new Date(lastDate).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })
      : null;

    let sent = 0;

    students.forEach(({ name, email }) => {
      const mailOptions = {
        from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🚀 New Job: ${jobTitle} at ${companyName} — Apply Now!`,
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#e8ff47,#a8ff78);height:4px;"></div>
            <div style="padding:36px 32px;">
              <div style="margin-bottom:24px;">
                <div style="display:inline-block;background:rgba(232,255,71,0.1);border:1px solid rgba(232,255,71,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:#e8ff47;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;">🔔 New Job Alert</div>
                <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#fff;">A New Job Has Been Posted!</h1>
                <p style="color:#9898b0;font-size:14px;margin:0;">Hi <strong style="color:#fff">${name}</strong>, a new opportunity is available. Apply before the deadline!</p>
              </div>
              <div style="background:#13131f;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:22px;margin-bottom:22px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e8ff47,#a8ff78);"></div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">${jobTitle}</div>
                <div style="font-size:14px;color:#7c6fcd;font-weight:600;margin-bottom:18px;">🏢 ${companyName}</div>
                <table style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:5px 0;font-size:13px;color:#9898b0;width:120px;">📍 Location</td><td style="padding:5px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${location || "Not specified"}</td></tr>
                  <tr><td style="padding:5px 0;font-size:13px;color:#9898b0;">💼 Job Type</td><td style="padding:5px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${jobType || "Full Time"}</td></tr>
                  <tr><td style="padding:5px 0;font-size:13px;color:#9898b0;">🎓 Batch</td><td style="padding:5px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${batch || "2024/2025"}</td></tr>
                  <tr><td style="padding:5px 0;font-size:13px;color:#9898b0;">💰 Salary</td><td style="padding:5px 0;font-size:22px;color:#e8ff47;font-weight:800;">${salary}</td></tr>
                  ${deadlineStr ? `<tr><td style="padding:5px 0;font-size:13px;color:#9898b0;">⏰ Deadline</td><td style="padding:5px 0;font-size:13px;color:#ff6b6b;font-weight:700;">${deadlineStr}</td></tr>` : ""}
                </table>
              </div>
              ${descSnippet ? `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 18px;margin-bottom:22px;"><div style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">About the Role</div><p style="font-size:13px;color:#9898b0;line-height:1.6;margin:0;">${descSnippet}</p></div>` : ""}
              <div style="text-align:center;">
                <a href="http://localhost:3000/jobs" style="display:inline-block;background:#e8ff47;color:#0d0d14;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;text-decoration:none;">View &amp; Apply Now →</a>
              </div>
              <p style="text-align:center;font-size:12px;color:#6b6b85;margin-top:16px;">Login to Placement Portal and apply before the deadline closes.</p>
            </div>
            <div style="background:#13131f;padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="font-size:11px;color:#6b6b85;margin:0;">Placement Portal · You received this because you are a registered student.</p>
            </div>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (sendErr) => {
        if (sendErr) console.error(`❌ Failed to send to ${email}:`, sendErr.message);
        else { sent++; console.log(`✅ Job alert sent to ${email} (${sent}/${students.length})`); }
      });
    });
  });
};

/* ================= CREATE JOB ================= */

exports.createJob = (req, res) => {
  const { title, description, location, salary, eligibility, job_type, experience, batch, last_date } = req.body;
  const company_id = req.user.id;

  if (!title || !description || !location || !salary) {
    return res.status(400).json({ message: "Title, description, location and salary are required" });
  }

  db.query("SELECT company_name FROM companies WHERE id = ?", [company_id], (err, companyResult) => {
    if (err) return res.status(500).json({ message: "Server error" });

    const companyName = companyResult[0]?.company_name || "A company";
    const sql = `
      INSERT INTO jobs (company_id, title, description, eligibility, location, salary, job_type, experience, batch, last_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    db.query(sql, [
      company_id, title, description, eligibility || null,
      location, salary, job_type || "Full Time",
      experience || "Fresher", batch || "2024/2025",
      last_date || null
    ], (err) => {
      if (err) { console.error("DB error creating job:", err.message); return res.status(500).json({ message: "Error posting job" }); }
      createJobNotification(title, companyName);
      sendJobAlertToAllStudents(title, companyName, location, salary, job_type, batch, description, last_date);
      res.json({ message: "Job Posted Successfully" });
    });
  });
};

/* ================= GET ALL ACTIVE JOBS (with pagination) ================= */

exports.getJobs = (req, res) => {
  const page     = parseInt(req.query.page)  || 1;
  const limit    = parseInt(req.query.limit) || 6;
  const offset   = (page - 1) * limit;
  const search   = req.query.search ? `%${req.query.search}%` : "%";

  const countSql = `
    SELECT COUNT(*) AS total FROM jobs
    JOIN companies ON jobs.company_id = companies.id
    WHERE jobs.is_active = 1
    AND (jobs.title LIKE ? OR jobs.location LIKE ? OR companies.company_name LIKE ?)
  `;

  db.query(countSql, [search, search, search], (err, countResult) => {
    if (err) return res.status(500).json({ message: "Error counting jobs" });

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const sql = `
      SELECT
        jobs.id, jobs.title, jobs.description, jobs.eligibility,
        jobs.location, jobs.salary, jobs.job_type, jobs.experience,
        jobs.batch, jobs.last_date, jobs.is_active,
        companies.company_name
      FROM jobs
      JOIN companies ON jobs.company_id = companies.id
      WHERE jobs.is_active = 1
      AND (jobs.title LIKE ? OR jobs.location LIKE ? OR companies.company_name LIKE ?)
      ORDER BY jobs.id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(sql, [search, search, search, limit, offset], (err, result) => {
      if (err) return res.status(500).json({ message: "Error fetching jobs" });
      res.json({ jobs: result, total, totalPages, currentPage: page });
    });
  });
};

/* ================= TOGGLE JOB ACTIVE/INACTIVE (Company) ================= */

exports.toggleJobStatus = (req, res) => {
  const { job_id, is_active } = req.body;
  const company_id = req.user.id;

  if (job_id === undefined || is_active === undefined) {
    return res.status(400).json({ message: "job_id and is_active are required" });
  }

  db.query(
    "UPDATE jobs SET is_active = ? WHERE id = ? AND company_id = ?",
    [is_active, job_id, company_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error updating job status" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Job not found or unauthorized" });
      res.json({ message: is_active ? "Job reopened successfully" : "Job closed successfully" });
    }
  );
};

/* ================= GET COMPANY'S OWN JOBS ================= */

exports.getCompanyJobs = (req, res) => {
  const company_id = req.user.id;
  db.query(
    "SELECT id, title, location, salary, job_type, last_date, is_active FROM jobs WHERE company_id = ? ORDER BY id DESC",
    [company_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error fetching jobs" });
      res.json(result);
    }
  );
};