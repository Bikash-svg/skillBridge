// In-memory store. No persistence -- all state resets on process restart.
// See ARCHITECTURE.md §2.4 for the rationale (demo doesn't need durability).

const { topics } = require("../data/topics");

// quizzes: keyed by quizId -> { userId, topicId, questions (with correctIndex), createdAt }
const quizzes = new Map();

// attempts: keyed by `${userId}:${topicId}` -> array of attempt results, oldest first
const attempts = new Map();

// subtopicsCache: keyed by topicId -> string[] of generated sub-concepts.
// Performance optimization only -- fine to lose on restart.
const subtopicsCache = new Map();

let quizCounter = 0;
function nextQuizId() {
  quizCounter += 1;
  return `quiz_${Date.now()}_${quizCounter}`;
}

function getTopics() {
  return topics;
}

function getTopicById(topicId) {
  return topics.find((t) => t.id === topicId) || null;
}

function saveQuiz({ userId, topicId, questions }) {
  const quizId = nextQuizId();
  quizzes.set(quizId, {
    quizId,
    userId,
    topicId,
    questions,
    createdAt: new Date().toISOString(),
  });
  return quizId;
}

function getQuiz(quizId) {
  return quizzes.get(quizId) || null;
}

function attemptKey(userId, topicId) {
  return `${userId}:${topicId}`;
}

function appendAttempt(userId, topicId, attempt) {
  const key = attemptKey(userId, topicId);
  const list = attempts.get(key) || [];
  list.push({ ...attempt, submittedAt: new Date().toISOString() });
  attempts.set(key, list);
}

function getLatestAttempt(userId, topicId) {
  const list = attempts.get(attemptKey(userId, topicId)) || [];
  return list.length ? list[list.length - 1] : null;
}

function getAllAttempts(userId, topicId) {
  return attempts.get(attemptKey(userId, topicId)) || [];
}

function getCachedSubtopics(topicId) {
  return subtopicsCache.get(topicId) || null;
}

function setCachedSubtopics(topicId, subConcepts) {
  subtopicsCache.set(topicId, subConcepts);
}

module.exports = {
  getTopics,
  getTopicById,
  saveQuiz,
  getQuiz,
  appendAttempt,
  getLatestAttempt,
  getAllAttempts,
  getCachedSubtopics,
  setCachedSubtopics,
};
