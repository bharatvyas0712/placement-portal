const db = require("../config/db");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const { createJobNotification } = require("./notificationController");

/* ─── Email Transporter with verification ─── */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter on startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Email transporter ERROR:", err.message);
    console.error("   Check EMAIL_USER and EMAIL_PASS in your .env file");
  } else {
    console.log("✅ Email transporter ready — emails will send successfully");
  }
});

/* ─── Status Step Labels ─── */
const STEP_LABELS = ["Application Registered", "Resume Shortlisted", "Technical Interview", "HR Interview", "Offer Extended"];

/* ================= SEND STATUS UPDATE EMAIL ================= */

const sendStatusEmail = (toEmail, studentName, jobTitle, status, hiringStep) => {
  const isApproved = status === "Approved";
  const stepLabel  = STEP_LABELS[hiringStep] || status;

  const mailOptions = {
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Application Update — ${jobTitle}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:${isApproved ? "#e8ff47" : status === "Rejected" ? "#ff6b6b" : "#7c6fcd"};padding:6px 0;"></div>
        <div style="padding:36px 32px;">
          <div style="font-size:28px;margin-bottom:8px;">${isApproved ? "🎉" : status === "Rejected" ? "📋" : "⏳"}</div>
          <h2 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#fff;">Application ${status}</h2>
          <p style="color:#9898b0;font-size:14px;margin:0 0 24px;">Hi ${studentName}, here's an update on your application for <strong style="color:#fff">${jobTitle}</strong>.</p>
          <div style="background:#13131f;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px;">
            <div style="font-size:12px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Current Stage</div>
            <div style="font-size:18px;font-weight:700;color:#e8ff47;">${stepLabel}</div>
          </div>
          <div style="background:${isApproved ? "rgba(232,255,71,0.08)" : status === "Rejected" ? "rgba(255,107,107,0.08)" : "rgba(124,111,205,0.08)"};border:1px solid ${isApproved ? "rgba(232,255,71,0.2)" : status === "Rejected" ? "rgba(255,107,107,0.2)" : "rgba(124,111,205,0.2)"};border-radius:12px;padding:18px 20px;">
            <p style="margin:0;font-size:14px;color:${isApproved ? "#e8ff47" : status === "Rejected" ? "#ff6b6b" : "#7c6fcd"};font-weight:600;">
              ${isApproved
                ? "✓ Congratulations! Your application has been approved. The company will reach out shortly."
                : status === "Rejected"
                ? "✗ Unfortunately your application was not selected this time. Keep applying!"
                : "⏳ Your application is being reviewed. You'll be notified of the next steps."}
            </p>
          </div>
          <p style="font-size:12px;color:#6b6b85;margin-top:28px;text-align:center;">Placement Portal · Automated notification</p>
        </div>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) console.error(`❌ Status email failed to ${toEmail}:`, err.message);
    else console.log(`✅ Status email sent to ${toEmail}`);
  });
};

/* ================= SEND JOB ALERT TO ALL STUDENTS ================= */

const sendJobAlertToAllStudents = (jobTitle, companyName, location, salary, jobType, batch, description) => {
  console.log("📧 Fetching students to send job alert...");

  db.query("SELECT name, email FROM students WHERE email IS NOT NULL AND email != ''", (err, students) => {
    if (err) {
      console.error("❌ DB error fetching students:", err.message);
      return;
    }

    if (!students || students.length === 0) {
      console.log("⚠ No students found in database to send job alert.");
      return;
    }

    console.log(`📨 Sending job alert to ${students.length} student(s)...`);

    let sent = 0;
    let failed = 0;

    students.forEach(({ name, email }) => {
      const descSnippet = description && description.length > 200
        ? description.substring(0, 200) + "…"
        : description || "";

      const mailOptions = {
        from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `🚀 New Job: ${jobTitle} at ${companyName} — Apply Now!`,
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">

            <div style="background:linear-gradient(90deg,#e8ff47,#a8ff78);height:4px;"></div>

            <div style="padding:36px 32px;">

              <div style="margin-bottom:24px;">
                <div style="display:inline-block;background:rgba(232,255,71,0.1);border:1px solid rgba(232,255,71,0.2);border-radius:99px;padding:5px 14px;font-size:11px;font-weight:700;color:#e8ff47;letter-spacing:1px;text-transform:uppercase;margin-bottom:14px;">
                  🔔 New Job Alert
                </div>
                <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#fff;">A New Job Has Been Posted!</h1>
                <p style="color:#9898b0;font-size:14px;margin:0;">Hi <strong style="color:#fff">${name}</strong>, a new opportunity is available. Apply before the deadline!</p>
              </div>

              <!-- Job Card -->
              <div style="background:#13131f;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:22px;margin-bottom:22px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e8ff47,#a8ff78);"></div>
                <div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:4px;">${jobTitle}</div>
                <div style="font-size:14px;color:#7c6fcd;font-weight:600;margin-bottom:18px;">🏢 ${companyName}</div>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#9898b0;">📍 Location</td>
                    <td style="padding:4px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${location || "Not specified"}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#9898b0;">💼 Job Type</td>
                    <td style="padding:4px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${jobType || "Full Time"}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#9898b0;">🎓 Batch</td>
                    <td style="padding:4px 0;font-size:13px;color:#e8e8f0;font-weight:600;">${batch || "2024/2025"}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#9898b0;">💰 Salary</td>
                    <td style="padding:4px 0;font-size:20px;color:#e8ff47;font-weight:800;">${salary}</td>
                  </tr>
                </table>
              </div>

              ${descSnippet ? `
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 18px;margin-bottom:22px;">
                <div style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">About the Role</div>
                <p style="font-size:13px;color:#9898b0;line-height:1.6;margin:0;">${descSnippet}</p>
              </div>` : ""}

              <!-- Hiring Steps -->
              <div style="margin-bottom:28px;">
                <div style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Hiring Process</div>
                <div>
                  ${[
                    { n:1, label:"Application Registration", color:"#e8ff47" },
                    { n:2, label:"Resume Shortlisting",      color:"#7c6fcd" },
                    { n:3, label:"Technical Interview",      color:"#ff9f43" },
                    { n:4, label:"HR Interview",             color:"#1dd1a1" }
                  ].map(s => `
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                      <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.05);border:2px solid ${s.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${s.color};flex-shrink:0;">${s.n}</div>
                      <div style="font-size:13px;color:#9898b0;">${s.label}</div>
                    </div>
                  `).join("")}
                </div>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;">
                <a href="http://localhost:3000/jobs"
                   style="display:inline-block;background:#e8ff47;color:#0d0d14;font-weight:800;font-size:15px;padding:14px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                  View & Apply Now →
                </a>
              </div>

              <p style="text-align:center;font-size:12px;color:#6b6b85;margin-top:20px;">
                Login to Placement Portal and apply before the deadline closes.
              </p>

            </div>

            <div style="background:#13131f;padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="font-size:11px;color:#6b6b85;margin:0;">
                Placement Portal &nbsp;·&nbsp; You received this because you're a registered student.<br/>
                Visit <a href="http://localhost:3000" style="color:#7c6fcd;text-decoration:none;">localhost:3000</a> to manage your applications.
              </p>
            </div>

          </div>
        `
      };

      transporter.sendMail(mailOptions, (sendErr) => {
        if (sendErr) {
          failed++;
          console.error(`❌ Failed to send to ${email}:`, sendErr.message);
        } else {
          sent++;
          console.log(`✅ Job alert sent to ${email} (${sent}/${students.length})`);
        }
      });
    });
  });
};

/* ================= APPLY JOB ================= */

exports.applyJob = (req, res) => {
  const { job_id } = req.body;
  const student_id = req.user.id;

  if (!job_id) return res.status(400).json({ message: "Job ID is required" });

  db.query(
    "SELECT * FROM applications WHERE student_id = ? AND job_id = ?",
    [student_id, job_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (result.length > 0) return res.status(400).json({ message: "You have already applied to this job" });

      db.query(
        "INSERT INTO applications (student_id, job_id, status, hiring_step) VALUES (?, ?, 'Pending', 0)",
        [student_id, job_id],
        (err) => {
          if (err) return res.status(500).json({ message: "Error applying for job" });
          res.json({ message: "Applied Successfully!" });
        }
      );
    }
  );
};

/* ================= GET STUDENT APPLICATIONS ================= */

exports.getStudentApplications = (req, res) => {
  const sql = `
    SELECT
      applications.id,
      applications.status,
      applications.hiring_step,
      jobs.title,
      jobs.description,
      jobs.location,
      jobs.salary,
      jobs.job_type,
      jobs.batch
    FROM applications
    JOIN jobs ON applications.job_id = jobs.id
    WHERE applications.student_id = ?
    ORDER BY applications.id DESC
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching applications" });
    res.json(result);
  });
};

/* ================= GET JOB APPLICANTS (COMPANY) ================= */

exports.getJobApplicants = (req, res) => {
  const sql = `
    SELECT
      applications.id,
      applications.status,
      applications.hiring_step,
      students.name,
      students.email,
      students.resume,
      jobs.title
    FROM applications
    JOIN students ON applications.student_id = students.id
    JOIN jobs     ON applications.job_id     = jobs.id
    WHERE jobs.company_id = ?
    ORDER BY applications.id DESC
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching applicants" });
    res.json(result);
  });
};

/* ================= GET STATS ================= */

exports.getStats = (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM jobs)         AS totalJobs,
      (SELECT COUNT(*) FROM students)     AS totalStudents,
      (SELECT COUNT(*) FROM applications) AS totalApplications
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching stats" });
    res.json(result[0]);
  });
};

/* ================= UPLOAD RESUME ================= */

exports.uploadResume = (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  db.query("UPDATE students SET resume = ? WHERE id = ?", [req.file.filename, req.user.id], (err) => {
    if (err) return res.status(500).json({ message: "Upload failed" });
    res.json({ message: "Resume uploaded successfully" });
  });
};

/* ================= CREATE JOB ================= */

exports.createJob = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

  const { title, description, location, salary, eligibility, job_type, experience, batch } = req.body;
  const company_id = req.user.id;

  db.query("SELECT company_name FROM companies WHERE id = ?", [company_id], (err, companyResult) => {
    if (err) return res.status(500).json({ message: "Server error" });

    const companyName = companyResult[0]?.company_name || "A company";

    const sql = `
      INSERT INTO jobs (company_id, title, description, eligibility, location, salary, job_type, experience, batch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [company_id, title, description, eligibility || null, location, salary, job_type || "Full Time", experience || "Fresher", batch || "2024/2025"],
      (err) => {
        if (err) return res.status(500).json({ message: "Error posting job" });

        console.log(`📌 Job "${title}" posted by ${companyName}. Triggering notifications...`);

        // 1. In-app bell notifications
        createJobNotification(title, companyName);

        // 2. Email all students
        sendJobAlertToAllStudents(title, companyName, location, salary, job_type, batch, description);

        res.json({ message: "Job Posted Successfully" });
      }
    );
  });
};

/* ================= UPDATE APPLICATION STATUS ================= */

exports.updateApplicationStatus = (req, res) => {
  const { application_id, status, hiring_step } = req.body;

  if (!application_id || !status) return res.status(400).json({ message: "application_id and status are required" });

  const stepMap = { "Pending": 0, "Shortlisted": 1, "Technical": 2, "HR": 3, "Approved": 4, "Rejected": 0 };
  const step = hiring_step !== undefined ? hiring_step : (stepMap[status] ?? 0);

  db.query(
    "UPDATE applications SET status = ?, hiring_step = ? WHERE id = ?",
    [status, step, application_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Error updating status" });

      const fetchSql = `
        SELECT students.name, students.email, jobs.title
        FROM applications
        JOIN students ON applications.student_id = students.id
        JOIN jobs     ON applications.job_id     = jobs.id
        WHERE applications.id = ?
      `;
      db.query(fetchSql, [application_id], (err, result) => {
        if (err || result.length === 0) return res.json({ message: "Status updated (email not sent)" });
        const { name, email, title } = result[0];
        sendStatusEmail(email, name, title, status, step);
        res.json({ message: `Status updated to "${status}" and email sent` });
      });
    }
  );
};