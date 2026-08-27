const express = require("express");
const store = require("../store/memoryStore");
const quizService = require("../services/quizService");
const recommendationService = require("../services/recommendationService");
const scoring = require("../utils/scoring");
const { requireFields } = require("../utils/validators");

const router = express.Router();

// POST /api/assessment/generate
// Body: { userId, topicId, knownSubConcepts? }
router.post("/generate", async (req, res, next) => {
  try {
    requireFields(req.body, ["userId", "topicId"]);
    const { userId, topicId, knownSubConcepts } = req.body;

    const topic = store.getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ error: `Unknown topicId: ${topicId}` });
    }

    const { quizId, questions } = await quizService.generateQuiz(userId, topicId, {
      knownSubConcepts,
    });
    res.json({ quizId, questions });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessment/submit
// Body: { userId, quizId, answers }
router.post("/submit", async (req, res, next) => {
  try {
    requireFields(req.body, ["userId", "quizId", "answers"]);
    const { userId, quizId, answers } = req.body;

    const quiz = store.getQuiz(quizId);
    if (!quiz) {
      return res.status(404).json({ error: `Unknown quizId: ${quizId}` });
    }
    if (quiz.userId !== userId) {
      return res.status(403).json({ error: "quizId does not belong to this userId" });
    }

    const topic = store.getTopicById(quiz.topicId);
    const { score, level, weakSubConcepts } = scoring.grade(quiz, answers);

    const recommendedResources = await recommendationService.getRecommendations({
      topic: topic ? topic.name : quiz.topicId,
      level,
      weakSubConcepts,
    });

    const result = { quizId, score, level, weakSubConcepts, recommendedResources };
    store.appendAttempt(userId, quiz.topicId, result);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/assessment/retest
// Body: { userId, topicId, weakSubConcepts? }
router.post("/retest", async (req, res, next) => {
  try {
    requireFields(req.body, ["userId", "topicId"]);
    const { userId, topicId, weakSubConcepts } = req.body;

    const topic = store.getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ error: `Unknown topicId: ${topicId}` });
    }

    // Prefer weakSubConcepts supplied by the frontend (sourced from
    // localStorage, so this survives a server restart) -- fall back to
    // server-side memory for same-session convenience / manual API testing.
    let weightSubConcepts = weakSubConcepts;
    if (!weightSubConcepts) {
      const latestAttempt = store.getLatestAttempt(userId, topicId);
      weightSubConcepts = latestAttempt ? latestAttempt.weakSubConcepts : [];
    }

    const { quizId, questions } = await quizService.generateQuiz(userId, topicId, {
      weightSubConcepts,
    });
    res.json({ quizId, questions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
