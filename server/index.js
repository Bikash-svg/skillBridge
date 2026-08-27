require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const topicsRouter = require("./routes/topics");
const assessmentRouter = require("./routes/assessment");
const configRouter = require("./routes/config");
const { isStubMode } = require("./services/llmService");

const app = express();
const PORT = process.env.PORT || 3000;

// Comma-separated list of allowed frontend origins, e.g.
//   ALLOWED_ORIGINS=https://skillbridge.onrender.com,http://localhost:5500
// Leave unset to allow any origin (fine for same-origin/dev setups where
// Express also serves the frontend, harmless but permissive otherwise).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, llmMode: isStubMode ? "stub" : "live" });
});

app.use("/api/topics", topicsRouter);
app.use("/api/assessment", assessmentRouter);
app.use("/api/config", configRouter);

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`SkillPulse server running on http://localhost:${PORT}`);
  console.log(`LLM mode: ${isStubMode ? "STUB (no LLM_API_URL/LLM_API_KEY set)" : "LIVE"}`);
});
