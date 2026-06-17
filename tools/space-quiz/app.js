const {
  checkAnswer,
  createMission,
  createMissionSummary,
  getPointsForCorrectAnswer,
  normalizeSettings,
  pickDefenseAction,
} = window.SpaceQuizMath;

const state = {
  mode: "free",
  settings: normalizeSettings({}),
  mission: null,
  missionStatus: "idle",
  currentQuestionIndex: 0,
  score: 0,
  streak: 0,
  totalAttempts: 0,
  completedQuestions: 0,
  questionDeadlineAt: 0,
  timerId: null,
  animationTimeoutId: null,
  currentStudent: "",
  assignmentId: "",
  assignmentApi: null,
  assignmentConfig: null,
  attemptIndex: 0,
};

const elements = {
  pageHeader: document.querySelector("#page-header"),
  assignmentPanel: document.querySelector("#assignment-panel"),
  assignmentTitle: document.querySelector("#assignment-title"),
  assignmentDescription: document.querySelector("#assignment-description"),
  assignmentProgressValue: document.querySelector("#assignment-progress-value"),
  assignmentFeedback: document.querySelector("#assignment-feedback"),
  studentSetup: document.querySelector("#student-setup"),
  studentSelect: document.querySelector("#student-select"),
  startAssignmentButton: document.querySelector("#start-assignment-button"),
  toolbar: document.querySelector("#toolbar"),
  gradeSelect: document.querySelector("#grade-select"),
  topicInput: document.querySelector("#topic-input"),
  questionCountSelect: document.querySelector("#question-count-select"),
  secondsSelect: document.querySelector("#seconds-select"),
  newMissionButton: document.querySelector("#new-mission-button"),
  gameShell: document.querySelector("#game-shell"),
  missionStatusLabel: document.querySelector("#mission-status-label"),
  missionModeBadge: document.querySelector("#mission-mode-badge"),
  spaceSceneVisual: document.querySelector("#space-scene-visual"),
  ship: document.querySelector("#ship"),
  meteor: document.querySelector("#meteor"),
  projectile: document.querySelector("#projectile"),
  missionProgressValue: document.querySelector("#mission-progress-value"),
  scoreValue: document.querySelector("#score-value"),
  streakValue: document.querySelector("#streak-value"),
  timeValue: document.querySelector("#time-value"),
  impactBarFill: document.querySelector("#impact-bar-fill"),
  missionFeedback: document.querySelector("#mission-feedback"),
  questionCaption: document.querySelector("#question-caption"),
  questionTopic: document.querySelector("#question-topic"),
  questionText: document.querySelector("#question-text"),
  answerGrid: document.querySelector("#answer-grid"),
  summaryPanel: document.querySelector("#summary-panel"),
  summaryTitle: document.querySelector("#summary-title"),
  summaryText: document.querySelector("#summary-text"),
  summaryScoreValue: document.querySelector("#summary-score-value"),
  summaryAccuracyValue: document.querySelector("#summary-accuracy-value"),
  summaryActionButton: document.querySelector("#summary-action-button"),
};

function applyBrandName() {
  const brandName = window.APP_CONFIG?.brandName ?? "SchoolTools";

  document.querySelectorAll("[data-brand-name]").forEach((element) => {
    element.textContent = brandName;
  });

  document.title = `Kosmiczny quiz - ${brandName}`;
}

function isAssignmentMode() {
  return state.mode === "assignment";
}

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function renderFeedback(element, message, status = "default") {
  element.textContent = message;

  if (status === "default") {
    element.removeAttribute("data-status");
    return;
  }

  element.dataset.status = status;
}

function renderAssignmentFeedback(message, status = "default") {
  renderFeedback(elements.assignmentFeedback, message, status);
}

function getCurrentQuestion() {
  return state.mission?.questions[state.currentQuestionIndex] || null;
}

function readFreeSettings() {
  state.settings = normalizeSettings({
    grade: elements.gradeSelect.value,
    topic: elements.topicInput.value,
    questionCount: elements.questionCountSelect.value,
    secondsPerQuestion: elements.secondsSelect.value,
  });
}

function syncToolbarSelections() {
  const settings = normalizeSettings(state.settings);
  state.settings = settings;
  elements.gradeSelect.value = settings.grade;
  ensureTopicOption(settings.topic);
  elements.topicInput.value = settings.topic;
  elements.questionCountSelect.value = String(settings.questionCount);
  elements.secondsSelect.value = String(settings.secondsPerQuestion);
}

function updateAssignmentProgress() {
  const totalQuestions = state.mission?.questions.length || state.settings.questionCount;
  elements.assignmentProgressValue.textContent =
    `${state.completedQuestions} / ${totalQuestions}`;
}

function renderDashboardHeader() {
  if (isAssignmentMode()) {
    elements.missionStatusLabel.textContent = "Zadanie nauczyciela";
    elements.missionModeBadge.textContent = "Tryb zadania";
    return;
  }

  elements.missionStatusLabel.textContent = "Trening swobodny";
  elements.missionModeBadge.textContent = "Tryb wolny";
}

function getSecondsLeft() {
  if (state.questionDeadlineAt <= 0) {
    return state.settings.secondsPerQuestion;
  }

  return Math.max(0, (state.questionDeadlineAt - Date.now()) / 1000);
}

function renderStats() {
  const totalQuestions = state.mission?.questions.length || state.settings.questionCount;
  const secondsLeft = getSecondsLeft();
  const ratio =
    state.settings.secondsPerQuestion > 0
      ? Math.max(0, Math.min(1, secondsLeft / state.settings.secondsPerQuestion))
      : 0;

  elements.missionProgressValue.textContent =
    `${state.completedQuestions} / ${totalQuestions}`;
  elements.scoreValue.textContent = String(state.score);
  elements.streakValue.textContent = String(state.streak);
  elements.timeValue.textContent = `${secondsLeft.toFixed(1)} s`;
  elements.impactBarFill.style.width = `${ratio * 100}%`;
  elements.spaceSceneVisual.style.setProperty("--impact-progress", String(1 - ratio));

  if (isAssignmentMode()) {
    updateAssignmentProgress();
  }
}

function renderQuestion() {
  const question = getCurrentQuestion();

  if (!question) {
    return;
  }

  elements.questionCaption.textContent =
    `Pytanie ${state.currentQuestionIndex + 1} z ${state.mission.questions.length}`;
  elements.questionTopic.textContent =
    `Klasa ${state.settings.grade}, dział: ${state.settings.topic}`;
  elements.questionText.textContent = question.prompt;
  elements.answerGrid.innerHTML = "";

  question.answers.forEach((answer) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.dataset.answerKey = answer.key;
    button.innerHTML = `<span>${answer.key}</span><strong></strong>`;
    button.querySelector("strong").textContent = answer.label;
    button.addEventListener("click", () => handleAnswer(answer.key));
    elements.answerGrid.append(button);
  });

  elements.meteor.style.setProperty(
    "--meteor-image",
    `url("./Images/meteor-${question.meteorVariant}.png")`,
  );
  elements.spaceSceneVisual.dataset.state = "running";
  elements.spaceSceneVisual.dataset.action = "incoming";
}

function setAnswerButtonsEnabled(isEnabled) {
  elements.answerGrid.querySelectorAll("button").forEach((button) => {
    button.disabled = !isEnabled;
  });
}

function clearAnimationTimeout() {
  if (state.animationTimeoutId) {
    window.clearTimeout(state.animationTimeoutId);
    state.animationTimeoutId = null;
  }
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startQuestionTimer() {
  stopTimer();
  state.questionDeadlineAt = Date.now() + state.settings.secondsPerQuestion * 1000;
  renderStats();

  state.timerId = window.setInterval(() => {
    renderStats();

    if (getSecondsLeft() <= 0) {
      handleCollision();
    }
  }, 80);
}

async function loadQuestions(settings) {
  if (!window.createAssignmentApiClient || !window.APP_CONFIG?.assignmentsApiUrl) {
    return [];
  }

  const api = state.assignmentApi || window.createAssignmentApiClient({
    apiUrl: window.APP_CONFIG.assignmentsApiUrl,
  });
  const response = await api.getSpaceQuizQuestions(
    settings.grade,
    settings.topic,
    settings.questionCount,
  );

  return response.questions || [];
}

async function startMission() {
  clearAnimationTimeout();
  stopTimer();
  hideSummary();

  if (!isAssignmentMode()) {
    readFreeSettings();
  }

  syncToolbarSelections();
  state.missionStatus = "loading";
  elements.gameShell.hidden = false;
  renderDashboardHeader();
  renderFeedback(elements.missionFeedback, "Przygotowuję pytania do lotu...");

  let questionPool = [];

  try {
    questionPool = await loadQuestions(state.settings);
  } catch (error) {
    if (isAssignmentMode()) {
      renderFeedback(
        elements.missionFeedback,
        `Nie udało się pobrać pytań z arkusza. ${error.message}`,
        "warning",
      );
      return;
    }
  }

  state.mission = createMission(state.settings, questionPool);
  state.missionStatus = "running";
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.totalAttempts = 0;
  state.completedQuestions = 0;
  state.attemptIndex += isAssignmentMode() ? 1 : 0;
  elements.spaceSceneVisual.dataset.state = "running";
  elements.spaceSceneVisual.dataset.action = "incoming";
  renderQuestion();
  renderStats();
  renderFeedback(
    elements.missionFeedback,
    "Meteoryt nadlatuje. Wybierz poprawną odpowiedź.",
  );
  startQuestionTimer();
}

function triggerDefenseAnimation(action) {
  elements.spaceSceneVisual.dataset.action = action;
  elements.spaceSceneVisual.dataset.state = action === "shoot" ? "shooting" : "dodging";
}

function moveToNextQuestion() {
  state.currentQuestionIndex += 1;

  if (state.currentQuestionIndex >= state.mission.questions.length) {
    handleMissionCompleted();
    return;
  }

  renderQuestion();
  renderStats();
  renderFeedback(
    elements.missionFeedback,
    "Dobrze! Następny meteoryt już leci.",
    "success",
  );
  setAnswerButtonsEnabled(true);
  startQuestionTimer();
}

async function submitCompletedAssignmentIfNeeded() {
  if (!isAssignmentMode() || !state.assignmentApi || !state.currentStudent) {
    return;
  }

  await state.assignmentApi.submitAssignmentAttempt({
    assignmentId: state.assignmentId,
    studentName: state.currentStudent,
    attemptIndex: state.attemptIndex,
    placementCorrect: true,
    readingCorrect: true,
    completedRounds: state.completedQuestions,
    completed: true,
    score: state.score,
    accuracyPercent:
      state.totalAttempts > 0
        ? Math.round((state.completedQuestions / state.totalAttempts) * 100)
        : 0,
    details: {
      grade: state.settings.grade,
      topic: state.settings.topic,
      questionCount: state.mission.questions.length,
      tool: "space-quiz",
    },
  });
}

async function handleMissionCompleted() {
  stopTimer();
  clearAnimationTimeout();
  state.missionStatus = "completed";
  elements.spaceSceneVisual.dataset.state = "completed";
  elements.spaceSceneVisual.dataset.action = "completed";
  setAnswerButtonsEnabled(false);
  renderStats();

  const summary = createMissionSummary({
    totalQuestions: state.mission.questions.length,
    completedQuestions: state.completedQuestions,
    totalAttempts: state.totalAttempts,
    score: state.score,
    failed: false,
  });

  renderSummary(summary);
  renderFeedback(
    elements.missionFeedback,
    `Brawo! Statek doleciał do końca z wynikiem ${state.score} punktów.`,
    "success",
  );

  if (!isAssignmentMode()) {
    return;
  }

  try {
    await submitCompletedAssignmentIfNeeded();
    renderAssignmentFeedback(
      `Brawo, ${state.currentStudent}! Ukończono całe zadanie.`,
      "success",
    );
  } catch (error) {
    renderAssignmentFeedback(
      `Lot ukończony, ale nie udało się zapisać wyniku. ${error.message}`,
      "warning",
    );
  }
}

function handleCollision() {
  stopTimer();
  clearAnimationTimeout();
  state.missionStatus = "failed";
  elements.spaceSceneVisual.dataset.state = "failed";
  elements.spaceSceneVisual.dataset.action = "collision";
  setAnswerButtonsEnabled(false);
  renderStats();

  const summary = createMissionSummary({
    totalQuestions: state.mission.questions.length,
    completedQuestions: state.completedQuestions,
    totalAttempts: state.totalAttempts,
    score: state.score,
    failed: true,
  });

  renderSummary(summary);
  renderFeedback(
    elements.missionFeedback,
    "Meteoryt trafił w statek. Zaczynamy lot od początku.",
    "warning",
  );

  if (isAssignmentMode()) {
    renderAssignmentFeedback(
      "Ten lot nie został zaliczony. Spróbuj jeszcze raz od pierwszego pytania.",
      "warning",
    );
  }
}

function handleAnswer(answerKey) {
  if (state.missionStatus !== "running") {
    return;
  }

  const question = getCurrentQuestion();
  const result = checkAnswer(question, answerKey);

  if (!result.isValid) {
    return;
  }

  state.totalAttempts += 1;

  if (!result.isCorrect) {
    state.streak = 0;
    renderStats();
    renderFeedback(
      elements.missionFeedback,
      "Jeszcze nie. Wybierz inną odpowiedź, zanim meteoryt doleci.",
      "warning",
    );
    return;
  }

  stopTimer();
  state.completedQuestions += 1;
  state.streak += 1;
  state.score += getPointsForCorrectAnswer({
    secondsLeft: getSecondsLeft(),
    streak: state.streak,
  });
  setAnswerButtonsEnabled(false);
  triggerDefenseAnimation(pickDefenseAction());
  renderStats();
  renderFeedback(elements.missionFeedback, "Dobrze! Świetna robota.", "success");

  state.animationTimeoutId = window.setTimeout(() => {
    state.animationTimeoutId = null;
    moveToNextQuestion();
  }, 780);
}

function renderSummary(summary) {
  elements.summaryPanel.hidden = false;
  elements.summaryTitle.textContent = summary.headline;
  elements.summaryText.textContent = summary.message;
  elements.summaryScoreValue.textContent = String(summary.score);
  elements.summaryAccuracyValue.textContent = `${summary.accuracyPercent}%`;
  elements.summaryActionButton.textContent = summary.failed
    ? "Zacznij od początku"
    : "Nowy lot";
}

function hideSummary() {
  elements.summaryPanel.hidden = true;
}

function applyAssignmentConfig(config) {
  state.assignmentConfig = config;
  state.settings = normalizeSettings(config.settings || {});
  syncToolbarSelections();
  elements.assignmentTitle.textContent = config.title || "Kosmiczny quiz";
  elements.assignmentDescription.textContent =
    state.settings.studentInstructions ||
    "Odpowiedz poprawnie na wszystkie pytania i uniknij każdego meteorytu.";
  updateAssignmentProgress();
  renderDashboardHeader();
}

function populateStudentList(students) {
  elements.studentSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Wybierz ucznia";
  elements.studentSelect.append(placeholder);

  students.forEach((studentName) => {
    const option = document.createElement("option");
    option.value = studentName;
    option.textContent = studentName;
    elements.studentSelect.append(option);
  });
}

async function startAssignmentForSelectedStudent() {
  const selectedStudent = elements.studentSelect.value;

  if (!selectedStudent) {
    renderAssignmentFeedback("Najpierw wybierz swoje imię z listy.", "warning");
    return;
  }

  state.currentStudent = selectedStudent;
  state.completedQuestions = 0;
  state.attemptIndex = 0;
  updateAssignmentProgress();

  try {
    if (state.assignmentApi) {
      await state.assignmentApi.startAssignment({
        assignmentId: state.assignmentId,
        studentName: state.currentStudent,
        completedRounds: 0,
      });
    }

    elements.studentSetup.hidden = true;
    elements.gameShell.hidden = false;
    renderAssignmentFeedback(
      `Powodzenia, ${state.currentStudent}. Startujesz w kosmicznym quizie.`,
    );
    await startMission();
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się rozpocząć zadania. ${error.message}`,
      "warning",
    );
  }
}

async function initializeAssignmentMode() {
  const params = getUrlParams();
  const assignmentId = params.get("a") || params.get("assignment");
  const apiUrl = window.APP_CONFIG?.assignmentsApiUrl || "";

  if (!assignmentId || !apiUrl || !window.createAssignmentApiClient) {
    return false;
  }

  state.mode = "assignment";
  state.assignmentId = assignmentId;
  elements.assignmentPanel.hidden = false;
  elements.pageHeader.hidden = true;
  elements.toolbar.hidden = true;
  elements.gameShell.hidden = true;
  renderAssignmentFeedback("Trwa wczytywanie zadania...");

  try {
    state.assignmentApi = window.createAssignmentApiClient({ apiUrl });
    const response = await state.assignmentApi.getAssignment(assignmentId);

    if (response.assignment?.tool !== "space-quiz") {
      state.mode = "free";
      elements.assignmentPanel.hidden = true;
      elements.pageHeader.hidden = false;
      elements.toolbar.hidden = false;
      elements.gameShell.hidden = false;
      return false;
    }

    applyAssignmentConfig(response.assignment);
    populateStudentList(response.students || []);
    renderAssignmentFeedback(
      "Wybierz swoje imię z listy, aby rozpocząć zadanie.",
    );
    return true;
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się wczytać zadania. ${error.message}`,
      "warning",
    );
    return true;
  }
}

function ensureTopicOption(topic) {
  const normalizedTopic = String(topic || "").trim();

  if (!normalizedTopic) {
    return;
  }

  const hasOption = Array.from(elements.topicInput.options).some(
    (option) => option.value === normalizedTopic,
  );

  if (hasOption) {
    return;
  }

  const option = document.createElement("option");
  option.value = normalizedTopic;
  option.textContent = normalizedTopic;
  elements.topicInput.append(option);
}

async function loadTopicOptions() {
  if (!window.createAssignmentApiClient || !window.APP_CONFIG?.assignmentsApiUrl) {
    return;
  }

  const previousTopic = elements.topicInput.value;

  try {
    const api = window.createAssignmentApiClient({
      apiUrl: window.APP_CONFIG.assignmentsApiUrl,
    });
    const response = await api.getSpaceQuizFilters(elements.gradeSelect.value);
    const topics = response.topics || [];
    elements.topicInput.innerHTML = "";

    if (!topics.length) {
      ensureTopicOption("Trening");
      elements.topicInput.value = "Trening";
      return;
    }

    (response.topics || []).forEach((topic) => {
      const option = document.createElement("option");
      option.value = topic;
      option.textContent = topic;
      elements.topicInput.append(option);
    });

    if (topics.includes(previousTopic)) {
      elements.topicInput.value = previousTopic;
    }
  } catch (error) {
    ensureTopicOption("Trening");
  }
}

function registerEvents() {
  elements.gradeSelect.addEventListener("change", loadTopicOptions);
  elements.newMissionButton.addEventListener("click", startMission);
  elements.summaryActionButton.addEventListener("click", startMission);
  elements.startAssignmentButton.addEventListener(
    "click",
    startAssignmentForSelectedStudent,
  );
}

async function initializeApp() {
  applyBrandName();
  registerEvents();
  syncToolbarSelections();
  renderDashboardHeader();
  await loadTopicOptions();

  const startedAssignmentMode = await initializeAssignmentMode();

  if (!startedAssignmentMode) {
    elements.gameShell.hidden = false;
    await startMission();
  }
}

initializeApp();
