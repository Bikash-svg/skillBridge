const { callLLM } = require("./llmService");

const RECOMMENDATION_SYSTEM_PROMPT = `You are a learning-recommendation engine for a corporate learning platform.
You must respond with STRICT JSON only -- no prose, no markdown code fences, no explanation.
The JSON must match this exact shape:
{
  "resources": [
    { "title": "resource or next-step title", "reason": "why this is recommended, referencing a specific weak sub-concept" }
  ]
}
Return 2 to 4 resources, each reason tied to one of the learner's weak sub-concepts.`;

function buildRecommendationPrompt({ topic, level, weakSubConcepts }) {
  // Marker string llmService's stub mode uses to distinguish this call type.
  return [
    "RECOMMENDATION_REQUEST",
    `Topic: ${topic}`,
    `Learner level: ${level}`,
    `Weak sub-concepts: ${weakSubConcepts.length ? weakSubConcepts.join(", ") : "none -- learner performed well overall"}`,
    "Generate a short, reasoned list of what this learner should study next.",
  ].join("\n");
}

function validateResources(resources) {
  if (!Array.isArray(resources)) {
    throw new Error("LLM did not return a valid resources array");
  }
  return resources.filter(
    (r) => typeof r.title === "string" && typeof r.reason === "string"
  );
}

/**
 * getRecommendations({ topic, level, weakSubConcepts })
 * Returns an array of { title, reason }.
 */
async function getRecommendations({ topic, level, weakSubConcepts }) {
  const userPrompt = buildRecommendationPrompt({ topic, level, weakSubConcepts });
  const result = await callLLM({
    systemPrompt: RECOMMENDATION_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
  });
  return validateResources(result.resources);
}

module.exports = { getRecommendations };
