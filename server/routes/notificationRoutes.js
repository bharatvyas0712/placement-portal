const router = require("express").Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAllRead,
  getUnreadCount
} = require("../controllers/notificationController");

router.get("/",           verifyToken, getNotifications);
router.get("/unread",     verifyToken, getUnreadCount);
router.put("/mark-read",  verifyToken, markAllRead);

module.exports = router;