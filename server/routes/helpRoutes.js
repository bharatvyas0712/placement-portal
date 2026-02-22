const router = require("express").Router();
const {
  submitQuery, getMyQueries,
  getAllQueries, replyToQuery, getQueryStats
} = require("../controllers/helpController");
const verifyToken  = require("../middleware/authMiddleware");

// Student routes
router.post("/",       verifyToken, submitQuery);    // submit new query
router.get("/mine",    verifyToken, getMyQueries);   // get my queries

// Admin routes
router.get("/admin/all",    verifyToken, getAllQueries);   // all queries
router.put("/admin/reply",  verifyToken, replyToQuery);    // reply + update status
router.get("/admin/stats",  verifyToken, getQueryStats);   // stats

module.exports = router;