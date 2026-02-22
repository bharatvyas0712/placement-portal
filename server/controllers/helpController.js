const db = require("../config/db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", port: 587, secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

/* ─── Email: notify admin of new query ─── */
const notifyAdminNewQuery = (studentName, subject, category, message) => {
  if (!process.env.ADMIN_EMAIL) return;
  transporter.sendMail({
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `📩 New Help Query: ${subject}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#7c6fcd,#e8ff47);height:4px;"></div>
        <div style="padding:32px;">
          <h2 style="color:#fff;margin:0 0 6px;">New Help Query Received</h2>
          <p style="color:#9898b0;font-size:14px;margin:0 0 20px;">A student has submitted a new query on the Placement Portal.</p>
          <div style="background:#13131f;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;margin-bottom:16px;">
            <div style="margin-bottom:10px;"><span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Student</span><div style="font-size:15px;color:#e8ff47;font-weight:700;margin-top:3px;">${studentName}</div></div>
            <div style="margin-bottom:10px;"><span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Category</span><div style="font-size:14px;color:#7c6fcd;font-weight:600;margin-top:3px;">${category}</div></div>
            <div style="margin-bottom:10px;"><span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Subject</span><div style="font-size:14px;color:#e8e8f0;margin-top:3px;">${subject}</div></div>
            <div><span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Message</span><div style="font-size:13px;color:#9898b0;margin-top:6px;line-height:1.6;">${message}</div></div>
          </div>
          <a href="http://localhost:3000/admin" style="display:inline-block;background:#7c6fcd;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View & Reply in Admin Panel →</a>
        </div>
      </div>`
  }, (err) => { if (err) console.error("Admin notify email error:", err.message); });
};

/* ─── Email: send admin reply to student ─── */
const sendReplyToStudent = (toEmail, studentName, subject, reply) => {
  transporter.sendMail({
    from: `"Placement Portal" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `✅ Reply to your query: ${subject}`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#0d0d14;color:#e8e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#1dd1a1,#00b894);height:4px;"></div>
        <div style="padding:32px;">
          <div style="font-size:32px;margin-bottom:12px;">✅</div>
          <h2 style="color:#fff;margin:0 0 6px;">Your Query Has Been Answered</h2>
          <p style="color:#9898b0;font-size:14px;margin:0 0 20px;">Hi ${studentName}, the admin has replied to your help query.</p>
          <div style="background:#13131f;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px;margin-bottom:16px;">
            <div style="margin-bottom:12px;"><span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Your Query</span><div style="font-size:14px;color:#9898b0;margin-top:4px;">${subject}</div></div>
            <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
              <span style="font-size:11px;color:#6b6b85;text-transform:uppercase;letter-spacing:1px;">Admin Reply</span>
              <div style="font-size:14px;color:#e8e8f0;margin-top:6px;line-height:1.7;">${reply}</div>
            </div>
          </div>
          <a href="http://localhost:3000/help" style="display:inline-block;background:#1dd1a1;color:#0d0d14;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">View in Help Center →</a>
        </div>
      </div>`
  }, (err) => { if (err) console.error("Reply email error:", err.message); else console.log(`✅ Reply sent to ${toEmail}`); });
};

/* ================= STUDENT: Submit Query ================= */
exports.submitQuery = (req, res) => {
  const { subject, category, message } = req.body;
  const student_id = req.user.id;

  if (!subject || !message) return res.status(400).json({ message: "Subject and message are required" });

  const sql = "INSERT INTO help_queries (student_id, subject, category, message) VALUES (?,?,?,?)";
  db.query(sql, [student_id, subject.trim(), category || "General", message.trim()], (err) => {
    if (err) return res.status(500).json({ message: "Error submitting query" });

    // Notify admin via email
    db.query("SELECT name FROM students WHERE id = ?", [student_id], (err2, result) => {
      const studentName = result?.[0]?.name || "A student";
      notifyAdminNewQuery(studentName, subject, category || "General", message);
    });

    res.json({ message: "Query submitted successfully! Admin will reply soon." });
  });
};

/* ================= STUDENT: Get Own Queries ================= */
exports.getMyQueries = (req, res) => {
  db.query(
    "SELECT id, subject, category, message, status, admin_reply, created_at, updated_at FROM help_queries WHERE student_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error fetching queries" });
      res.json(result);
    }
  );
};

/* ================= ADMIN: Get All Queries ================= */
exports.getAllQueries = (req, res) => {
  const sql = `
    SELECT
      hq.id, hq.subject, hq.category, hq.message,
      hq.status, hq.admin_reply, hq.created_at, hq.updated_at,
      s.name AS student_name, s.email AS student_email
    FROM help_queries hq
    JOIN students s ON hq.student_id = s.id
    ORDER BY
      FIELD(hq.status, 'Open', 'In Progress', 'Resolved'),
      hq.created_at DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching queries" });
    res.json(result);
  });
};

/* ================= ADMIN: Reply to Query ================= */
exports.replyToQuery = (req, res) => {
  const { query_id, admin_reply, status } = req.body;

  if (!query_id || !admin_reply) return res.status(400).json({ message: "query_id and admin_reply are required" });

  const newStatus = status || "Resolved";

  db.query(
    "UPDATE help_queries SET admin_reply = ?, status = ? WHERE id = ?",
    [admin_reply.trim(), newStatus, query_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Error saving reply" });

      // Fetch student info to send email
      const sql = `
        SELECT s.name, s.email, hq.subject
        FROM help_queries hq
        JOIN students s ON hq.student_id = s.id
        WHERE hq.id = ?
      `;
      db.query(sql, [query_id], (err2, result) => {
        if (!err2 && result.length) {
          const { name, email, subject } = result[0];
          sendReplyToStudent(email, name, subject, admin_reply);
        }
      });

      res.json({ message: "Reply sent successfully" });
    }
  );
};

/* ================= ADMIN: Get Query Stats ================= */
exports.getQueryStats = (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(status = 'Open') AS open_count,
      SUM(status = 'In Progress') AS inprogress_count,
      SUM(status = 'Resolved') AS resolved_count
    FROM help_queries
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching stats" });
    res.json(result[0]);
  });
};