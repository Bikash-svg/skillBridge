const express = require("express");
const store = require("../store/memoryStore");
const subtopicService = require("../services/subtopicService");

const router = express.Router();

// GET /api/topics
router.get("/", (req, res) => {
  res.json({ topics: store.getTopics() });
});

// POST /api/topics/:topicId/subtopics
router.post("/:topicId/subtopics", async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const topic = store.getTopicById(topicId);
    if (!topic) {
      return res.status(404).json({ error: `Unknown topicId: ${topicId}` });
    }
    const subConcepts = await subtopicService.getSubtopics(topicId);
    res.json({ subConcepts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

