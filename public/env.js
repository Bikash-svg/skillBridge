// ---------------------------------------------------------------------
// SkillPulse frontend runtime config.
//
// Leave SKILLPULSE_API_BASE as "" when this frontend is served by the
// same Express app as the API (the default setup — see server/index.js,
// which does `express.static(public)`). In that case all API calls are
// same-origin relative paths like "/api/topics" and this file is a no-op.
//
// If you deploy the frontend separately from the backend (e.g. frontend
// on a static site host, backend as its own Render/Railway web service),
// set this to the backend's full origin (no trailing slash):
//
//   window.SKILLPULSE_API_BASE = "https://skillbridge-api.onrender.com";
//
// Also make sure the backend's ALLOWED_ORIGINS env var includes this
// frontend's origin so the browser's CORS check passes — see .env.example.
// ---------------------------------------------------------------------
window.SKILLPULSE_API_BASE = "https://skillbridge-pury.onrender.com";
