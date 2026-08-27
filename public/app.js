// SkillPulse frontend logic. Endpoint contract: see FRONTEND.md + UPGRADE-V2.md.
// All localStorage access goes through window.SkillPulseStorage (storage.js).

const storage = window.SkillPulseStorage;

// Empty string when frontend + API share an origin (default). Set via
// public/env.js when the API is hosted at a separate URL.
const API_BASE = (window.SKILLPULSE_API_BASE || "").replace(/\/$/, "");

const state = {
  userId: "demo-user",
  masteryThreshold: 80,
  topics: [],
  selectedTopicId: null,
  selectedTopicName: null,
  selectedCategory: null,
  subConcepts: [],
  knownSubConcepts: [],
  currentQuizId: null,
  currentQuestions: [],
  selectedAnswers: {},
  isRetest: false,
};

const els = {
  exitHomeBtn: document.getElementById("btn-exit-home"),
  flowStepper: document.getElementById("flow-stepper"),

  homeTopicGroups: document.getElementById("home-topic-groups"),
  sessionGrid: document.getElementById("session-grid"),
  emptyState: document.getElementById("empty-state"),

  bellBtn: document.getElementById("btn-bell"),
  bellDot: document.getElementById("bell-dot"),
  sessionsPanel: document.getElementById("sessions-panel"),
  sessionsPanelBackdrop: document.getElementById("sessions-panel-backdrop"),
  btnSessionsClose: document.getElementById("btn-sessions-close"),

  topicGroups: document.getElementById("topic-groups"),
  btnStart: document.getElementById("btn-start"),

  subtopicChips: document.getElementById("subtopic-chips"),
  btnSubtopicsContinue: document.getElementById("btn-subtopics-continue"),
  btnSubtopicsSkip: document.getElementById("btn-subtopics-skip"),

  quizTitle: document.getElementById("quiz-title"),
  quizProgressFill: document.getElementById("quiz-progress-fill"),
  quizProgressLabel: document.getElementById("quiz-progress-label"),
  quizQuestions: document.getElementById("quiz-questions"),
  btnSubmitQuiz: document.getElementById("btn-submit-quiz"),

  resultScore: document.getElementById("result-score"),
  resultLevel: document.getElementById("result-level"),
  weakList: document.getElementById("weak-list"),
  recommendationList: document.getElementById("recommendation-list"),
  videoList: document.getElementById("video-list"),
  masteryActionArea: document.getElementById("mastery-action-area"),

  errorBanner: document.getElementById("error-banner"),

  exitModal: document.getElementById("exit-confirm-modal"),
  btnExitConfirm: document.getElementById("btn-exit-confirm"),
  btnExitCancel: document.getElementById("btn-exit-cancel"),
};

const FLOW_STEPS = ["topic", "subtopics", "quiz", "results"];

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  els.flowStepper.hidden = id === "screen-home";
}

function setFlowStep(stepName) {
  const idx = FLOW_STEPS.indexOf(stepName);
  document.querySelectorAll(".flow-step").forEach((el) => {
    const stepIdx = FLOW_STEPS.indexOf(el.dataset.step);
    el.classList.remove("done", "current");
    if (stepIdx < idx) el.classList.add("done");
    else if (stepIdx === idx) el.classList.add("current");
  });
}

function showError(message) {
  els.errorBanner.textContent = message;
  els.errorBanner.hidden = false;
  setTimeout(() => { els.errorBanner.hidden = true; }, 5000);
}

async function apiCall(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

function setButtonLoading(button, isLoading, loadingText) {
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText || "Working…";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function completionCircleSVG(percent, size = 64) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return `
    <div class="completion-circle">
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" />
        <circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
      </svg>
      <div class="pct">${percent}%</div>
    </div>`;
}

// ---------------------------------------------------------------------
// Exit to Home (§3)
// ---------------------------------------------------------------------

function goHome() {
  state.selectedTopicId = null;
  state.selectedTopicName = null;
  state.selectedCategory = null;
  state.subConcepts = [];
  state.knownSubConcepts = [];
  state.currentQuizId = null;
  state.currentQuestions = [];
  state.selectedAnswers = {};
  state.isRetest = false;
  renderHome();
  showScreen("screen-home");
  closeSessionsPanel();
}

els.exitHomeBtn.addEventListener("click", () => {
  const midQuiz = document.getElementById("screen-quiz").classList.contains("active");
  const hasAnswers = Object.keys(state.selectedAnswers).length > 0;
  if (midQuiz && hasAnswers) {
    els.exitModal.hidden = false;
  } else {
    goHome();
  }
});
els.btnExitConfirm.addEventListener("click", () => {
  els.exitModal.hidden = true;
  goHome();
});
els.btnExitCancel.addEventListener("click", () => {
  els.exitModal.hidden = true;
});

// ---------------------------------------------------------------------
// Previous-sessions panel (bell icon toggle — mobile drawer, always-on
// side column on desktop; see home-grid / home-sessions-col CSS)
// ---------------------------------------------------------------------

function isMobileViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function openSessionsPanel() {
  if (!isMobileViewport()) return; // desktop: panel is always visible, nothing to toggle
  els.sessionsPanel.classList.add("open");
  els.sessionsPanelBackdrop.hidden = false;
  els.bellBtn.setAttribute("aria-expanded", "true");
}

function closeSessionsPanel() {
  els.sessionsPanel.classList.remove("open");
  els.sessionsPanelBackdrop.hidden = true;
  els.bellBtn.setAttribute("aria-expanded", "false");
}

function toggleSessionsPanel() {
  if (els.sessionsPanel.classList.contains("open")) {
    closeSessionsPanel();
  } else {
    openSessionsPanel();
  }
}

els.bellBtn.addEventListener("click", () => {
  if (!document.getElementById("screen-home").classList.contains("active")) {
    goHome();
  }
  toggleSessionsPanel();
});
els.btnSessionsClose.addEventListener("click", closeSessionsPanel);
els.sessionsPanelBackdrop.addEventListener("click", closeSessionsPanel);

// ---------------------------------------------------------------------
// Screen 0: Home (§8)
// ---------------------------------------------------------------------

function renderHome() {
  renderTopicGroups(els.homeTopicGroups, (topic) => startAssessmentFromHome(topic));

  const sessions = storage.getAllSessions();
  const topicIds = Object.keys(sessions).filter((id) => sessions[id].attempts.length > 0);

  els.bellDot.hidden = topicIds.length === 0;

  if (topicIds.length === 0) {
    els.emptyState.hidden = false;
    els.sessionGrid.innerHTML = "";
    return;
  }

  els.emptyState.hidden = true;
  els.sessionGrid.innerHTML = "";

  topicIds
    .sort((a, b) => new Date(sessions[b].lastUpdated) - new Date(sessions[a].lastUpdated))
    .forEach((topicId) => {
      const session = sessions[topicId];
      const mastery = storage.getMasteryPercent(topicId);
      const latest = session.attempts[session.attempts.length - 1];

      const card = document.createElement("div");
      card.className = "feature-card-elevated session-card";
      card.innerHTML = `
        ${completionCircleSVG(mastery)}
        <div class="session-card-info">
          <div class="category-eyebrow">
            <span class="category-dot" data-cat="${session.category}"></span>
            <span class="t-eyebrow muted">${session.category}</span>
          </div>
          <div class="t-title">${session.topicName}</div>
          <div class="session-card-meta">
            <span class="level-badge" data-level="${latest.level}">${latest.level}</span>
            <span class="t-caption">${timeAgo(session.lastUpdated)}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-continue">Continue</button>
      `;
      card.querySelector(".btn-continue").addEventListener("click", () => continueSession(topicId));
      els.sessionGrid.appendChild(card);
    });
}

async function continueSession(topicId) {
  const session = storage.getSession(topicId);
  if (!session) return;

  state.selectedTopicId = topicId;
  state.selectedTopicName = session.topicName;
  state.selectedCategory = session.category;
  state.knownSubConcepts = session.knownSubConcepts || [];
  state.isRetest = true;

  const latestAttempt = storage.getLatestAttempt(topicId);
  const weakSubConcepts = latestAttempt ? latestAttempt.weakSubConcepts : [];

  const btn = document.querySelector(`.session-card .btn-continue`);
  try {
    if (btn) setButtonLoading(btn, true, "Loading…");
    const data = await apiCall("/api/assessment/retest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: state.userId, topicId, weakSubConcepts }),
    });
    state.currentQuizId = data.quizId;
    state.currentQuestions = data.questions;
    state.selectedAnswers = {};
    renderQuiz("Continuing — New Quiz");
    setFlowStep("quiz");
    showScreen("screen-quiz");
    closeSessionsPanel();
  } catch (err) {
    showError(err.message);
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

// ---------------------------------------------------------------------
// Screen 1: Topic Select (also used to render the "Pick a topic" side
// of the Home screen — see renderTopicGroups())
// ---------------------------------------------------------------------

async function loadTopics() {
  try {
    const data = await apiCall("/api/topics");
    state.topics = data.topics;
    renderTopicGroups(els.topicGroups, (topic, chip) => selectTopic(topic, chip));
  } catch (err) {
    showError(err.message);
  }
}

function renderTopicGroups(container, onSelect) {
  if (!container) return;
  const groups = {};
  for (const topic of state.topics) {
    if (!groups[topic.category]) groups[topic.category] = [];
    groups[topic.category].push(topic);
  }

  container.innerHTML = "";
  for (const [category, topics] of Object.entries(groups)) {
    const groupEl = document.createElement("div");
    groupEl.className = "topic-group";

    const header = document.createElement("div");
    header.className = "category-eyebrow";
    header.innerHTML = `<span class="category-dot" data-cat="${category}"></span><span class="t-eyebrow muted">${category}</span>`;
    groupEl.appendChild(header);

    const chips = document.createElement("div");
    chips.className = "topic-chips";
    for (const topic of topics) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "topic-chip";
      chip.textContent = topic.name;
      chip.addEventListener("click", () => onSelect(topic, chip));
      chips.appendChild(chip);
    }
    groupEl.appendChild(chips);
    container.appendChild(groupEl);
  }
}

function selectTopic(topic, chipEl) {
  state.selectedTopicId = topic.id;
  state.selectedTopicName = topic.name;
  state.selectedCategory = topic.category;
  document.querySelectorAll("#topic-groups .topic-chip").forEach((c) => c.classList.remove("selected"));
  chipEl.classList.add("selected");
  els.btnStart.disabled = false;
}

// Home-screen quick-start: clicking a topic chip on Home begins the
// flow immediately (no separate "Continue" button needed there).
async function startAssessmentFromHome(topic) {
  state.selectedTopicId = topic.id;
  state.selectedTopicName = topic.name;
  state.selectedCategory = topic.category;
  storage.ensureTopicEntry(topic.id, topic.name, topic.category);

  const chip = Array.from(els.homeTopicGroups.querySelectorAll(".topic-chip")).find(
    (c) => c.textContent === topic.name
  );
  try {
    if (chip) setButtonLoading(chip, true, "Loading…");
    await loadSubtopics(topic.id);
    setFlowStep("subtopics");
    showScreen("screen-subtopics");
    closeSessionsPanel();
  } catch (err) {
    showError(err.message);
  } finally {
    if (chip) setButtonLoading(chip, false);
  }
}

els.btnStart.addEventListener("click", async () => {
  if (!state.selectedTopicId) return;
  storage.ensureTopicEntry(state.selectedTopicId, state.selectedTopicName, state.selectedCategory);
  setButtonLoading(els.btnStart, true, "Loading…");
  try {
    await loadSubtopics(state.selectedTopicId);
    setFlowStep("subtopics");
    showScreen("screen-subtopics");
  } catch (err) {
    showError(err.message);
  } finally {
    setButtonLoading(els.btnStart, false);
  }
});

// ---------------------------------------------------------------------
// Screen 1b: Sub-topic Self-Report (§1)
// ---------------------------------------------------------------------

async function loadSubtopics(topicId) {
  const data = await apiCall(`/api/topics/${topicId}/subtopics`, { method: "POST" });
  state.subConcepts = data.subConcepts;
  state.knownSubConcepts = [];
  renderSubtopicChips();
}

function renderSubtopicChips() {
  els.subtopicChips.innerHTML = "";
  state.subConcepts.forEach((concept) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "topic-chip";
    chip.textContent = concept;
    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      if (chip.classList.contains("selected")) {
        state.knownSubConcepts.push(concept);
      } else {
        state.knownSubConcepts = state.knownSubConcepts.filter((c) => c !== concept);
      }
    });
    els.subtopicChips.appendChild(chip);
  });
}

async function proceedFromSubtopics() {
  storage.saveKnownSubConcepts(state.selectedTopicId, state.knownSubConcepts);
  setButtonLoading(els.btnSubtopicsContinue, true, "Generating quiz…");
  try {
    const data = await apiCall("/api/assessment/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: state.userId,
        topicId: state.selectedTopicId,
        knownSubConcepts: state.knownSubConcepts,
      }),
    });
    state.currentQuizId = data.quizId;
    state.currentQuestions = data.questions;
    state.selectedAnswers = {};
    state.isRetest = false;
    renderQuiz("First Assessment");
    setFlowStep("quiz");
    showScreen("screen-quiz");
  } catch (err) {
    showError(err.message);
  } finally {
    setButtonLoading(els.btnSubtopicsContinue, false);
  }
}

els.btnSubtopicsContinue.addEventListener("click", proceedFromSubtopics);
els.btnSubtopicsSkip.addEventListener("click", () => {
  state.knownSubConcepts = [];
  proceedFromSubtopics();
});

// ---------------------------------------------------------------------
// Screen 2: Quiz
// ---------------------------------------------------------------------

function renderQuiz(title) {
  els.quizTitle.textContent = title;
  els.quizQuestions.innerHTML = "";

  state.currentQuestions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "feature-card question-card";

    const meta = document.createElement("div");
    meta.className = "question-meta";
    meta.textContent = `Question ${idx + 1} · ${q.difficulty}`;
    card.appendChild(meta);

    const text = document.createElement("div");
    text.className = "question-text";
    text.textContent = q.text;
    card.appendChild(text);

    const optionList = document.createElement("div");
    optionList.className = "option-list";
    q.options.forEach((optionText, optIdx) => {
      const opt = document.createElement("div");
      opt.className = "option-item";
      opt.textContent = optionText;
      opt.addEventListener("click", () => {
        state.selectedAnswers[q.id] = optIdx;
        optionList.querySelectorAll(".option-item").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        updateQuizProgress();
      });
      optionList.appendChild(opt);
    });
    card.appendChild(optionList);
    els.quizQuestions.appendChild(card);
  });

  updateQuizProgress();
}

function updateQuizProgress() {
  const total = state.currentQuestions.length;
  const answered = Object.keys(state.selectedAnswers).length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  els.quizProgressFill.style.width = `${pct}%`;
  els.quizProgressLabel.textContent = `${answered} of ${total}`;
  els.btnSubmitQuiz.disabled = answered < total;
}

els.btnSubmitQuiz.addEventListener("click", async () => {
  setButtonLoading(els.btnSubmitQuiz, true, "Scoring…");
  try {
    const data = await apiCall("/api/assessment/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: state.userId,
        quizId: state.currentQuizId,
        answers: state.selectedAnswers,
      }),
    });

    storage.saveAttempt(state.selectedTopicId, state.selectedTopicName, state.selectedCategory, data);
    renderResults(data);
    setFlowStep("results");
    showScreen("screen-results");
  } catch (err) {
    showError(err.message);
  } finally {
    setButtonLoading(els.btnSubmitQuiz, false);
  }
});

// ---------------------------------------------------------------------
// Screen 3: Results (§4 split layout, §6 mastery threshold)
// ---------------------------------------------------------------------

function youtubeSearchUrl(title) {
  const q = encodeURIComponent(`${title} ${state.selectedTopicName}`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function renderResults(attempt) {
  els.resultScore.textContent = `${attempt.score}%`;
  els.resultLevel.textContent = attempt.level;
  els.resultLevel.dataset.level = attempt.level;

  els.weakList.innerHTML = "";
  if (attempt.weakSubConcepts.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No major weak areas — strong performance across the board.";
    els.weakList.appendChild(li);
  } else {
    attempt.weakSubConcepts.forEach((concept) => {
      const li = document.createElement("li");
      li.textContent = concept;
      els.weakList.appendChild(li);
    });
  }

  els.recommendationList.innerHTML = "";
  els.videoList.innerHTML = "";
  attempt.recommendedResources.forEach((res) => {
    const item = document.createElement("div");
    item.className = "feature-card resource-item";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "rec-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const title = document.createElement("span");
    title.className = "rec-title";
    title.textContent = res.title;

    const chevron = document.createElement("span");
    chevron.className = "rec-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "▾";

    toggle.appendChild(title);
    toggle.appendChild(chevron);

    const reasonEl = document.createElement("div");
    reasonEl.className = "rec-reason";
    reasonEl.textContent = res.reason;
    reasonEl.hidden = true;

    toggle.addEventListener("click", () => {
      const isOpen = !reasonEl.hidden;
      reasonEl.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      item.classList.toggle("expanded", !isOpen);
    });

    item.appendChild(toggle);
    item.appendChild(reasonEl);
    els.recommendationList.appendChild(item);

    const videoItem = document.createElement("div");
    videoItem.className = "feature-card video-item";
    const link = document.createElement("a");
    link.href = youtubeSearchUrl(res.title);
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "btn-utility";
    link.textContent = "🔎 Search related videos on YouTube";
    videoItem.appendChild(link);
    els.videoList.appendChild(videoItem);
  });

  renderMasteryActions();
}

function renderMasteryActions() {
  const mastery = storage.getMasteryPercent(state.selectedTopicId);
  els.masteryActionArea.innerHTML = "";

  if (mastery >= state.masteryThreshold) {
    const badge = document.createElement("div");
    badge.className = "mastered-badge";
    badge.textContent = "🏆 Mastered";
    els.masteryActionArea.appendChild(badge);
  } else {
    const retakeBtn = document.createElement("button");
    retakeBtn.className = "btn btn-primary";
    retakeBtn.textContent = "Retake Test";
    retakeBtn.addEventListener("click", retakeTest);
    els.masteryActionArea.appendChild(retakeBtn);
  }

  const anotherBtn = document.createElement("button");
  anotherBtn.className = "btn btn-secondary";
  anotherBtn.textContent = "Choose Another Topic";
  anotherBtn.addEventListener("click", () => {
    setFlowStep("topic");
    showScreen("screen-topics");
  });
  els.masteryActionArea.appendChild(anotherBtn);
}

async function retakeTest() {
  const latestAttempt = storage.getLatestAttempt(state.selectedTopicId);
  const weakSubConcepts = latestAttempt ? latestAttempt.weakSubConcepts : [];
  state.isRetest = true;

  const btn = els.masteryActionArea.querySelector(".btn-primary");
  try {
    if (btn) setButtonLoading(btn, true, "Preparing retest…");
    const data = await apiCall("/api/assessment/retest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: state.userId,
        topicId: state.selectedTopicId,
        weakSubConcepts,
      }),
    });
    state.currentQuizId = data.quizId;
    state.currentQuestions = data.questions;
    state.selectedAnswers = {};
    renderQuiz("Retest — Targeting Your Weak Areas");
    setFlowStep("quiz");
    showScreen("screen-quiz");
  } catch (err) {
    showError(err.message);
  } finally {
    if (btn) setButtonLoading(btn, false);
  }
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------

async function init() {
  try {
    const config = await apiCall("/api/config");
    state.masteryThreshold = config.masteryThreshold;
  } catch {
    // keep default of 80 if config fetch fails
  }
  await loadTopics();
  renderHome();
}

init();
