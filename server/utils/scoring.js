// Rule-based grading and level classification. No AI involved -- see
// README.md §8 ("Where the AI Does Work vs. Where Logic Is Rule-Based").

function levelForScore(percent) {
  if (percent <= 40) return "Beginner";
  if (percent <= 75) return "Intermediate";
  return "Advanced";
}

/**
 * grade(quiz, answers)
 * quiz.questions must include correctIndex (server-side copy, never sent to client).
 * answers: { [questionId]: selectedOptionIndex }
 * Returns { score, level, weakSubConcepts, correctCount, totalCount }
 */
function grade(quiz, answers) {
  const questions = quiz.questions;
  let correctCount = 0;
  const weakSubConceptsSet = new Set();

  for (const q of questions) {
    const selected = answers ? answers[q.id] : undefined;
    if (selected === q.correctIndex) {
      correctCount += 1;
    } else {
      weakSubConceptsSet.add(q.subConcept);
    }
  }

  const totalCount = questions.length;
  const score = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const level = levelForScore(score);

  return {
    score,
    level,
    weakSubConcepts: Array.from(weakSubConceptsSet),
    correctCount,
    totalCount,
  };
}

module.exports = { grade, levelForScore };
