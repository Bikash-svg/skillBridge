// Single boundary to the LLM provider. Every other service calls callLLM()
// -- nothing else in the codebase should know the provider's request/response
// shape. See ARCHITECTURE.md §4.
//
// Configured for Groq's OpenAI-compatible chat completions API:
//   LLM_API_URL=https://api.groq.com/openai/v1/chat/completions
//   LLM_MODEL=openai/gpt-oss-120b (Groq deprecated the llama-3.3-70b-versatile
//     chat models -- check https://console.groq.com/docs/models if this 404s)
//   LLM_API_KEY=gsk_... (from console.groq.com/keys)
//
// STUB MODE: if LLM_API_KEY / LLM_API_URL aren't set in .env, this returns
// realistic fake JSON instead of calling out to a real API. This lets the
// rest of the app be built and demoed before the supplied LLM API is wired
// in (PHASES.md Phase 2 / Phase 7).

const LLM_API_URL = process.env.LLM_API_URL || "";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "";

const isStubMode = !LLM_API_URL || !LLM_API_KEY;

function stripCodeFence(text) {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function safeParseJSON(text) {
  const cleaned = stripCodeFence(text);
  return JSON.parse(cleaned);
}

/**
 * callLLM({ systemPrompt, userPrompt, expectJson })
 * Returns parsed JSON (if expectJson) or raw text.
 * Throws on network/parse failure -- callers should catch and handle.
 */
async function callLLM({ systemPrompt, userPrompt, expectJson = true }) {
  if (isStubMode) {
    return stubResponse(userPrompt, expectJson);
  }

  const response = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
      // Groq supports this for models that guarantee valid JSON output.
      // Harmless to include; the prompt-level JSON instructions still
      // apply as a fallback for models/providers that ignore this field.
      ...(expectJson ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`LLM API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Groq (and any OpenAI-compatible API) returns:
  // { choices: [ { message: { role: "assistant", content: "..." } } ] }
  const rawText = data.choices?.[0]?.message?.content || "";

  if (!expectJson) return rawText;

  try {
    return safeParseJSON(rawText);
  } catch (err) {
    throw new Error(`LLM returned malformed JSON: ${err.message}`);
  }
}

// ---------------------------------------------------------------------
// Stub data generators -- shape-matched to what quizService /
// recommendationService expect back from a real call.
// ---------------------------------------------------------------------

function stubResponse(userPrompt, expectJson) {
  if (!expectJson) {
    return "Stub LLM response (text mode).";
  }
  if (userPrompt.includes("RECOMMENDATION_REQUEST")) {
    return stubRecommendations();
  }
  if (userPrompt.includes("SUBTOPIC_REQUEST")) {
    return stubSubtopics(userPrompt);
  }
  return stubQuiz(userPrompt);
}

function stubSubtopics(userPrompt) {
  const topicMatch = userPrompt.match(/Topic:\s*(.+)/i);
  const topicName = topicMatch ? topicMatch[1].trim() : "this topic";
  const facets = [
    "fundamentals",
    "core terminology",
    "common frameworks",
    "practical application",
    "common pitfalls",
    "advanced techniques",
    "measurement & evaluation",
    "real-world case studies",
  ];
  return {
    subConcepts: facets.map((f) => `${topicName} ${f}`),
  };
}

function stubQuiz(userPrompt) {
  const topicMatch = userPrompt.match(/Topic:\s*(.+)/i);
  const topicName = topicMatch ? topicMatch[1].trim() : "the selected topic";

  const subConcepts = [
    `${topicName} fundamentals`,
    `${topicName} best practices`,
    `${topicName} common pitfalls`,
    `${topicName} advanced application`,
  ];
  const difficulties = ["easy", "easy", "medium", "medium", "hard", "hard"];

  const questions = difficulties.map((difficulty, i) => {
    const sub = subConcepts[i % subConcepts.length];
    return {
      id: `q${i + 1}`,
      text: `[Stub] Which statement best reflects a ${difficulty}-level understanding of ${sub}?`,
      options: [
        `Correct-ish answer about ${sub}`,
        `Plausible distractor A for ${sub}`,
        `Plausible distractor B for ${sub}`,
        `Plausible distractor C for ${sub}`,
      ],
      correctIndex: 0,
      difficulty,
      subConcept: sub,
    };
  });

  return { questions };
}

function stubRecommendations() {
  return {
    resources: [
      {
        title: "[Stub] Foundations refresher",
        reason: "Recommended because you missed questions on core fundamentals.",
      },
      {
        title: "[Stub] Applied practice set",
        reason: "Recommended because you missed questions on best practices.",
      },
    ],
  };
}

module.exports = { callLLM, isStubMode };
