const { callLLM } = require("./llmService");
const store = require("../store/memoryStore");

const SUBTOPIC_SYSTEM_PROMPT = `You are a curriculum-structuring engine for a corporate learning platform.
You must respond with STRICT JSON only -- no prose, no markdown code fences, no explanation.
The JSON must match this exact shape:
{ "subConcepts": ["sub-topic 1", "sub-topic 2", ...] }
Generate 6 to 10 representative sub-topics that make up this broader topic, each a short
phrase (a few words), suitable for a learner to self-report familiarity with.`;

function buildPrompt(topicName) {
  // Marker string llmService's stub mode uses to distinguish this call type.
  return `SUBTOPIC_REQUEST\nTopic: ${topicName}\n\nList the sub-topics that make up this topic.`;
}

function validateSubConcepts(subConcepts) {
  if (!Array.isArray(subConcepts) || subConcepts.length === 0) {
    throw new Error("LLM did not return a valid subConcepts array");
  }
  return subConcepts.filter((s) => typeof s === "string" && s.trim().length > 0);
}

/**
 * getSubtopics(topicId)
 * Returns string[] of sub-concepts for a topic. Cached in memoryStore so
 * repeat calls in the same server session don't re-hit the LLM.
 */
async function getSubtopics(topicId) {
  const cached = store.getCachedSubtopics(topicId);
  if (cached) return cached;

  const topic = store.getTopicById(topicId);
  if (!topic) {
    throw new Error(`Unknown topicId: ${topicId}`);
  }

  const result = await callLLM({
    systemPrompt: SUBTOPIC_SYSTEM_PROMPT,
    userPrompt: buildPrompt(topic.name),
    expectJson: true,
  });

  const subConcepts = validateSubConcepts(result.subConcepts);
  store.setCachedSubtopics(topicId, subConcepts);
  return subConcepts;
}

module.exports = { getSubtopics };
