const db = require("../config/db");

/* ================= CREATE NOTIFICATIONS FOR ALL STUDENTS ================= */
// Called internally when a job is posted

exports.createJobNotification = (jobTitle, companyName) => {
  // Get all student IDs
  const getStudentsSql = "SELECT id FROM students";
  db.query(getStudentsSql, (err, students) => {
    if (err) { console.log("NOTIFICATION ERROR:", err); return; }

    if (students.length === 0) return;

    const message = `🏢 ${companyName} just posted a new job: "${jobTitle}"`;
    const values = students.map(s => [s.id, message]);

    const insertSql = "INSERT INTO notifications (student_id, message) VALUES ?";
    db.query(insertSql, [values], (err) => {
      if (err) console.log("NOTIFICATION INSERT ERROR:", err);
      else console.log(`Notifications sent to ${students.length} students`);
    });
  });
};

/* ================= GET NOTIFICATIONS FOR LOGGED-IN STUDENT ================= */

exports.getNotifications = (req, res) => {
  const student_id = req.user.id;

  const sql = `
    SELECT id, message, is_read, created_at
    FROM notifications
    WHERE student_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `;

  db.query(sql, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching notifications" });
    res.json(result);
  });
};

/* ================= MARK ALL AS READ ================= */

exports.markAllRead = (req, res) => {
  const student_id = req.user.id;

  const sql = "UPDATE notifications SET is_read = 1 WHERE student_id = ?";
  db.query(sql, [student_id], (err) => {
    if (err) return res.status(500).json({ message: "Error marking notifications" });
    res.json({ message: "All notifications marked as read" });
  });
};

/* ================= GET UNREAD COUNT ================= */

exports.getUnreadCount = (req, res) => {
  const student_id = req.user.id;

  const sql = "SELECT COUNT(*) AS count FROM notifications WHERE student_id = ? AND is_read = 0";
  db.query(sql, [student_id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error fetching count" });
    res.json({ count: result[0].count });
  });
};