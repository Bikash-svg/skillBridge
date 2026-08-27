# SkillPulse

An AI-powered skill assessment platform. A user picks a topic, an AI-generated
MCQ quiz measures their current level, the AI recommends what to study next,
and a follow-up quiz shows their level improving.

This README describes the **architecture, request flow, and setup** needed to
build the demo. It is scoped as an instruction set for an AI coding assistant
(e.g. Claude Code) to implement the project end to end.

---

## 1. Core Loop

```
Pick topic → AI generates quiz → user answers → score + level + recommendation
    → user studies → AI generates a new quiz targeting weak areas → retake
    → show level improvement (e.g. Beginner → Intermediate)
```

This is the entire demo: **assess → recommend → re-assess.**

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js (plain HTTP or a minimal framework — e.g. Express) |
| Frontend | Vanilla HTML, CSS, JS (no framework) |
| Data storage | In-memory JS objects (no DB, no persistence — resets on server restart) |
| Auth | None — hardcoded/mock `userId` |
| LLM provider | An LLM API will be supplied (endpoint/key provided separately) specifically for the MCQ generation step. Isolate all LLM calls behind a single service module (see §5) regardless — keeps the endpoint working the moment credentials are dropped in, and keeps it swappable if the provider changes. |

---

## 3. Suggested Folder Structure

```
skillpulse/
├── README.md
├── package.json
├── .env.example
├── server/
│   ├── index.js                 # entry point, starts HTTP server
│   ├── routes/
│   │   ├── topics.js             # GET /api/topics
│   │   └── assessment.js         # generate / submit / retest
│   ├── services/
│   │   ├── llmService.js         # single point of contact with the LLM API
│   │   ├── quizService.js        # prompt building + response parsing for quizzes
│   │   └── recommendationService.js  # prompt building + parsing for recommendations
│   ├── store/
│   │   └── memoryStore.js        # in-memory data: topics, quizzes, attempts
│   ├── utils/
│   │   ├── scoring.js            # grading + score→level mapping
│   │   └── validators.js         # request payload checks
│   └── data/
│       └── topics.js             # static list of demo topics
├── public/                       # frontend (vanilla HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── docs/
    └── backend-demo-flow.md      # original flow spec (already provided)
```

---

## 4. In-Memory Data Model

Since there's no DB, keep everything in a few JS objects/maps inside
`memoryStore.js`:

```js
// Topics — static, seeded at startup, grouped by competency category
// (modeled on the Karmayogi/iGOT competency framework)
topics = [
  // 1. Behavioural & Managerial Skills
  { id: "leadership", category: "Behavioural & Managerial Skills", name: "Leadership" },
  { id: "communication", category: "Behavioural & Managerial Skills", name: "Communication" },
  { id: "decision-making", category: "Behavioural & Managerial Skills", name: "Decision-making" },
  { id: "ethics", category: "Behavioural & Managerial Skills", name: "Ethics" },
  { id: "project-management", category: "Behavioural & Managerial Skills", name: "Project Management" },
  { id: "change-management", category: "Behavioural & Managerial Skills", name: "Change Management" },
  { id: "citizen-centricity", category: "Behavioural & Managerial Skills", name: "Citizen-centricity & Service Delivery" },

  // 2. Domain/Functional Knowledge
  { id: "survey-design", category: "Domain/Functional Knowledge", name: "Survey Design" },
  { id: "sampling", category: "Domain/Functional Knowledge", name: "Sampling" },
  { id: "national-accounts", category: "Domain/Functional Knowledge", name: "National Accounts" },
  { id: "price-statistics", category: "Domain/Functional Knowledge", name: "Price Statistics" },
  { id: "labour-statistics", category: "Domain/Functional Knowledge", name: "Labour Statistics" },
  { id: "sdg-indicators", category: "Domain/Functional Knowledge", name: "SDG Indicators" },
  { id: "evidence-in-public-policy", category: "Domain/Functional Knowledge", name: "Evidence in Public Policy" },
  { id: "insights-from-data-for-policy", category: "Domain/Functional Knowledge", name: "Insights from Data for Policy" },

  // 3. Technology & Emerging Tech
  { id: "artificial-intelligence", category: "Technology & Emerging Tech", name: "Artificial Intelligence" },
  { id: "digital-public-infrastructure", category: "Technology & Emerging Tech", name: "Digital Tools & Digital Public Infrastructure" },
  { id: "data-analysis", category: "Technology & Emerging Tech", name: "Data Analysis & Data-driven Decision-making" },
  { id: "cybersecurity-cloud-governance", category: "Technology & Emerging Tech", name: "Cybersecurity, Cloud & Digital Governance" },

  // 4. Wellness & Personal Effectiveness
  { id: "y-break-wellness", category: "Wellness & Personal Effectiveness", name: "Y-Break (Workplace Yoga/Wellness)" },

  // 5. Indigenous Knowledge Systems
  { id: "indigenous-knowledge-systems", category: "Indigenous Knowledge Systems", name: "Indigenous Knowledge Systems" }
]

// Quizzes — keyed by quizId
quizzes = {
  [quizId]: {
    userId,
    topicId,
    questions: [
      {
        id, text, options: [4 strings],
        correctIndex,        // stripped before sending to frontend
        difficulty,          // easy | medium | hard
        subConcept
      }
    ],
    createdAt
  }
}

// Attempts — history per user+topic, keyed by userId+topicId
attempts = {
  [`${userId}:${topicId}`]: [
    {
      quizId, score, level,
      weakSubConcepts: [...],
      recommendedResources: [...],
      submittedAt
    }
    // most recent = last element; retest reads this for weak areas
  ]
}
```

No file writes, no external DB calls — all reset on process restart, which
is fine for a live demo.

---

## 5. LLM Service Boundary

An LLM API will be supplied specifically for the MCQ generation (and
recommendation) step — endpoint URL, key, and model name go in `.env`
(see §10). The endpoint must be built to work against that API, but should
still go through one boundary module so it's easy to swap or version later.

Create one module, `services/llmService.js`, that every other service calls
through. It should expose something like:

```js
async function callLLM({ systemPrompt, userPrompt, expectJson = true }) {
  // provider-specific call goes here
  // return parsed JSON if expectJson, else raw text
}
```

Keep provider credentials and request/response shape entirely inside this
file. `quizService.js` and `recommendationService.js` should never construct
provider-specific request bodies directly — they call `callLLM()` with a
prompt and get structured data back. This makes it trivial to swap providers
later without touching route or scoring logic.

**Prompting requirements:**
- Always request strict JSON output, no prose wrapper.
- Quiz generation prompt must specify: question text, 4 options, correct
  answer index, difficulty (easy/medium/hard), and a `subConcept` tag per
  question.
- Recommendation prompt takes `{ topic, level, weakSubConcepts }` and must
  return a short list of resources, each with a `reason` referencing the
  specific weak sub-concept it addresses.
- Retest prompt reuses the quiz-generation prompt but adds the prior
  `weakSubConcepts` as a weighting instruction (more questions from those
  areas).

---

## 6. API Endpoints

### `GET /api/topics`
Returns the static topic list from `data/topics.js`, each entry including
its `id`, `name`, and `category` (one of the 5 competency categories in
§4). The frontend is expected to render these grouped by `category` in the
dropdown/selector — see `FRONTEND.md` for the exact rendering approach.

### `POST /api/assessment/generate`
Input: `{ userId, topicId }`
- Calls `quizService` → `llmService` to generate MCQs spanning easy→hard,
  each tagged with sub-concept.
- Stores the full quiz (with correct answers) in `memoryStore.quizzes`.
- Strips `correctIndex` from each question before responding.
- Returns: `{ quizId, questions }`

### `POST /api/assessment/submit`
Input: `{ userId, quizId, answers }`
- Loads quiz from `memoryStore`, grades locally (rule-based, no AI) via
  `utils/scoring.js`.
- Maps score → level:
  - 0–40% → Beginner
  - 41–75% → Intermediate
  - 76–100% → Advanced
- Computes `weakSubConcepts` from incorrectly answered questions.
- Calls `recommendationService` → `llmService` with
  `{ topic, level, weakSubConcepts }` for a reasoned resource list.
- Appends result to `memoryStore.attempts`.
- Returns: `{ score, level, weakSubConcepts, recommendedResources }`

### `POST /api/assessment/retest`
Input: `{ userId, topicId }`
- Looks up most recent attempt in `memoryStore.attempts` for
  `weakSubConcepts`.
- Calls `quizService` again, passing those weak areas in as a weighting
  instruction.
- Returns a new quiz in the same shape as `/generate`.
- Frontend then calls `/api/assessment/submit` again to complete the loop.

---

## 7. Request Flow Summary

```
1. GET  /api/topics
        → dropdown of topics

2. POST /api/assessment/generate   { userId, topicId }
        → AI-generated quiz (no answers shown)

3. POST /api/assessment/submit     { userId, quizId, answers }
        → score, level, weak areas, recommended resources

4. [user studies the recommended resource, marks it done — frontend-only state]

5. POST /api/assessment/retest     { userId, topicId }
        → new AI-generated quiz targeting weak areas
        → back to step 3 to submit and see updated level
```

---

## 8. Where the AI Does Work vs. Where Logic Is Rule-Based

| Stage | AI or rule-based? |
|---|---|
| Quiz generation | AI — writes questions, difficulty, sub-concept tags |
| Grading | Rule-based — answer-key comparison |
| Level classification | Rule-based — score-to-level mapping |
| Recommendation | AI — reasoned list of what to study next |
| Retest generation | AI — new quiz weighted toward prior weak spots |

---

## 9. Explicitly Out of Scope

- No database persistence — in-memory only, resets on restart.
- No authentication/SSO — mock `userId` from the frontend (e.g. a hardcoded
  string or simple prompt).
- No external course catalogue integration — recommendations are generated
  directly by the AI.
- No async job queue — quiz generation is called synchronously; it's fast
  enough for a live demo.

---

## 10. Setup Instructions

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in the supplied LLM API endpoint/key/model — the MCQ generation
# endpoint depends on this being set correctly

# 3. Run the server
npm start
# Serves the API and the /public frontend, e.g. on http://localhost:3000
```

`.env.example` should contain at minimum:

```
PORT=3000
LLM_API_KEY=
LLM_MODEL=
```

---

## 11. Why This Is a Strong Demo

The audience sees a clear before → after: a user's level visibly moves from
Beginner to Intermediate (or higher) after one learning cycle — driven
entirely by AI-generated assessment and AI-generated, reasoning-backed
recommendations, not a static course catalogue.

---

## 12. Frontend

See `FRONTEND.md` for a step-by-step guide to building the basic vanilla
HTML/CSS/JS frontend, including the exact backend endpoints each screen
calls — written so the frontend can be upgraded independently later
without needing to re-derive the API contract.
