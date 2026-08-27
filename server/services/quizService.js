const { callLLM } = require("./llmService");
const store = require("../store/memoryStore");

const QUIZ_SYSTEM_PROMPT = `You are a quiz-generation engine for a corporate learning platform.
You must respond with STRICT JSON only -- no prose, no markdown code fences, no explanation.
The JSON must match this exact shape:
{
  "questions": [
    {
      "id": "q1",
      "text": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "difficulty": "easy" | "medium" | "hard",
      "subConcept": "short sub-concept label"
    }
  ]
}
Generate exactly 6 questions spanning easy, medium, and hard difficulty (2 of each).
Each question must be tagged with the specific sub-concept it tests.`;

function buildGeneratePrompt(topicName, { weightSubConcepts, knownSubConcepts } = {}) {
  let prompt = `Topic: ${topicName}\n\nGenerate a 6-question multiple-choice quiz for this topic, for a corporate employee being assessed on their current knowledge.`;

  if (weightSubConcepts && weightSubConcepts.length) {
    prompt += `\n\nWeight the questions toward these sub-concepts the learner previously struggled with: ${weightSubConcepts.join(
      ", "
    )}. At least 4 of the 6 questions should target these areas.`;
  }

  if (knownSubConcepts && knownSubConcepts.length) {
    prompt += `\n\nThe learner has self-reported confidence in these specific sub-concepts: ${knownSubConcepts.join(
      ", "
    )}. Generate mostly HARD-difficulty questions for these specific sub-concepts to verify their claimed mastery. For all other sub-concepts in this topic, use the normal easy/medium/hard spread.`;
  }

  return prompt;
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("LLM did not return a valid questions array");
  }
  for (const q of questions) {
    if (
      typeof q.text !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      typeof q.correctIndex !== "number" ||
      q.correctIndex < 0 ||
      q.correctIndex > 3 ||
      typeof q.subConcept !== "string" ||
      !q.subConcept.trim()
    ) {
      throw new Error("LLM returned a malformed question object");
    }
  }
  return questions;
}

function assignIds(questions) {
  return questions.map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }));
}

/**
 * generateQuiz(userId, topicId, options)
 * options.weightSubConcepts -- optional array of weak sub-concepts to weight toward (retest)
 * options.knownSubConcepts -- optional array of self-reported known sub-concepts (hard-question check)
 * Returns { quizId, questions } with correctIndex stripped for client consumption.
 */
async function generateQuiz(userId, topicId, options = {}) {
  const topic = store.getTopicById(topicId);
  if (!topic) {
    throw new Error(`Unknown topicId: ${topicId}`);
  }

  const userPrompt = buildGeneratePrompt(topic.name, options);
  const result = await callLLM({
    systemPrompt: QUIZ_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
  });

  const questions = assignIds(validateQuestions(result.questions));
  const quizId = store.saveQuiz({ userId, topicId, questions });

  const clientQuestions = questions.map(({ correctIndex, ...rest }) => rest);
  return { quizId, questions: clientQuestions };
}

module.exports = { generateQuiz };
