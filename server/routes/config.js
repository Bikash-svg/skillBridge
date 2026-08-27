const express = require("express");
const { MASTERY_THRESHOLD } = require("../config");

const router = express.Router();

// GET /api/config
router.get("/", (req, res) => {
  res.json({ masteryThreshold: MASTERY_THRESHOLD });
});

module.exports = router;
