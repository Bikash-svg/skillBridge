// All direct localStorage access lives here -- nothing else in the app
// should call localStorage.getItem/setItem directly. See UPGRADE-V2.md §7.5.

(function () {
  const STORAGE_KEY = "skillpulse:sessions";

  function readRaw() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeRaw(sessions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // localStorage unavailable/full -- fail silently, app still works
      // without persistence for this session.
    }
  }

  function getAllSessions() {
    return readRaw();
  }

  function getSession(topicId) {
    const sessions = readRaw();
    return sessions[topicId] || null;
  }

  function saveAttempt(topicId, topicName, category, attemptResult) {
    const sessions = readRaw();
    const existing = sessions[topicId] || {
      topicId,
      topicName,
      category,
      knownSubConcepts: [],
      attempts: [],
      lastUpdated: null,
    };
    existing.topicName = topicName;
    existing.category = category;
    existing.attempts.push({
      quizId: attemptResult.quizId,
      score: attemptResult.score,
      level: attemptResult.level,
      weakSubConcepts: attemptResult.weakSubConcepts,
      recommendedResources: attemptResult.recommendedResources,
      submittedAt: new Date().toISOString(),
    });
    existing.lastUpdated = new Date().toISOString();
    sessions[topicId] = existing;
    writeRaw(sessions);
  }

  function saveKnownSubConcepts(topicId, knownSubConcepts) {
    const sessions = readRaw();
    if (!sessions[topicId]) return; // topic entry created on first saveAttempt
    sessions[topicId].knownSubConcepts = knownSubConcepts;
    writeRaw(sessions);
  }

  function ensureTopicEntry(topicId, topicName, category) {
    const sessions = readRaw();
    if (!sessions[topicId]) {
      sessions[topicId] = {
        topicId,
        topicName,
        category,
        knownSubConcepts: [],
        attempts: [],
        lastUpdated: new Date().toISOString(),
      };
      writeRaw(sessions);
    }
  }

  // mastery% = max(score across all saved attempts for that topic) --
  // peak score, not average. A single strong attempt counts as
  // demonstrated mastery even if an earlier attempt was weaker.
  function getMasteryPercent(topicId) {
    const session = getSession(topicId);
    if (!session || !session.attempts.length) return 0;
    return Math.max(...session.attempts.map((a) => a.score));
  }

  function getLatestAttempt(topicId) {
    const session = getSession(topicId);
    if (!session || !session.attempts.length) return null;
    return session.attempts[session.attempts.length - 1];
  }

  window.SkillPulseStorage = {
    getAllSessions,
    getSession,
    saveAttempt,
    saveKnownSubConcepts,
    ensureTopicEntry,
    getMasteryPercent,
    getLatestAttempt,
  };
})();
