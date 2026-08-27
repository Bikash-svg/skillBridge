# AI Skill Assessment Platform — Backend Flow (Demo Scope)

## What we're demoing

A user picks a topic they want to learn. The AI tests their current
knowledge with an MCQ quiz, scores it, tells them their level
(Beginner / Intermediate / Advanced), and recommends what to study
next. After they finish studying, they retake a fresh quiz — focused
on what they got wrong — and we show their level improving.

This is the "AI assesses → recommends → re-assesses" loop, end to end.

---

## The 4-Step User Journey

### Step 1 — Pick a topic
User selects a department/topic from a dropdown (e.g. "Survey Design",
"Python for Data Analysis", "Data Privacy").

**Backend:** `GET /api/topics` returns the list of available topics.

---

### Step 2 — AI generates an MCQ test
Backend asks Claude to generate a set of MCQs for the chosen topic,
spanning easy → hard difficulty, each tagged with the sub-concept it
tests (e.g. "stratified sampling", "sampling bias").

**Backend:** `POST /api/assessment/generate`
- Input: `{ userId, topicId }`
- Calls the LLM service with a structured prompt asking for strict
  JSON output (question text, 4 options, correct answer index,
  difficulty, sub-concept).
- Strips the correct answers before sending questions to the frontend
  (so the client can't cheat).
- Returns: quiz ID + questions (no answers).

---

### Step 3 — Score → Level → Recommendation
User submits their answers. Backend grades them, classifies the
user's level, and generates personalized next-step recommendations.

**Backend:** `POST /api/assessment/submit`
- Input: `{ userId, quizId, answers }`
- Grades against the stored correct answers.
- Maps score → level:
  - 0–40% → Beginner
  - 41–75% → Intermediate
  - 76–100% → Advanced
- Identifies which sub-concepts the user got wrong ("weak areas").
- Calls the LLM again with `{ topic, level, weakSubConcepts }` to
  generate a short list of recommended resources/next steps, each
  with a reason ("recommended because you missed questions on X").
- Returns: `{ score, level, weakSubConcepts, recommendedResources }`.

---

### Step 4 — Learn, then retest
User marks their recommended resource/task as "completed." This
triggers a fresh quiz on the same topic — but this time the questions
are weighted toward their previous weak areas.

**Backend:** `POST /api/assessment/retest`
- Input: `{ userId, topicId }`
- Looks up the user's most recent attempt for that topic to get their
  prior weak sub-concepts.
- Re-runs the same quiz-generation logic, passing those weak areas
  into the prompt so the new quiz targets them.
- User submits again via the same `/api/assessment/submit` flow.
- Result: a second score/level, so we can show progression
  (e.g. "Beginner → Intermediate") as the demo's payoff moment.

---

## Request Flow Summary

```
1. GET  /api/topics
        → dropdown of topics

2. POST /api/assessment/generate   { userId, topicId }
        → AI-generated quiz (no answers shown)

3. POST /api/assessment/submit     { userId, quizId, answers }
        → score, level, weak areas, recommended resources

4. [user studies the recommended resource, marks it done]

5. POST /api/assessment/retest     { userId, topicId }
        → new AI-generated quiz targeting weak areas
        → back to step 3 to submit and see updated level
```

---

## Where the AI actually does work

| Stage | What the AI does |
|---|---|
| Quiz generation | Writes topic-relevant MCQs with difficulty & sub-concept tags |
| Grading | Rule-based (not AI) — straightforward answer-key comparison |
| Level classification | Rule-based score-to-level mapping |
| Recommendation | Takes the level + weak sub-concepts and writes a short, reasoned list of what to study next |
| Retest generation | Writes a new quiz, deliberately weighted toward the user's previous weak spots |

---

## What's intentionally out of scope for this demo

- No real database persistence discussion here (kept out of this doc
  on purpose — infra detail, not flow).
- No authentication/SSO — a hardcoded/mock `userId` is enough.
- No iGOT Karmayogi integration — recommendations are generated
  directly by the AI, not pulled from an external course catalogue.
- No async job queue — quiz generation is fast enough to call
  synchronously for the demo.

---

## Why this is a strong demo

The judges/audience see a clear before → after: a user's level
visibly moves from Beginner to Intermediate (or higher) after one
learning cycle, driven entirely by AI-generated assessment and
AI-generated, reasoning-backed recommendations — not a static course
catalogue.
