const {
  checkAnswer,
  createMission,
  createMissionSummary,
  getPenaltySeconds,
  getPointsForCorrectAnswer,
  getRangeLabel,
  normalizeSettings,
} = window.MultiplicationGameMath;

const state = {
  mode: "free",
  maxFactor: 10,
  questionCount: 12,
  timeLimitSeconds: 60,
  mission: null,
  missionStatus: "idle",
  currentQuestionIndex: 0,
  currentQuestionAttemptCount: 0,
  questionStates: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  totalAttempts: 0,
  firstTryCorrectCount: 0,
  timeLeft: 60,
  timerId: null,
  missionStartedAt: 0,
  missionDeadlineAt: 0,
  boostLevel: 0,
  boostTimeoutId: null,
  recentResults: [],
  lastSummary: null,
  currentStudent: "",
  assignmentId: "",
  assignmentApi: null,
  assignmentConfig: null,
  completedRounds: 0,
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
  maxFactorSelect: document.querySelector("#max-factor-select"),
  questionCountSelect: document.querySelector("#question-count-select"),
  timeLimitSelect: document.querySelector("#time-limit-select"),
  newMissionButton: document.querySelector("#new-mission-button"),
  gameShell: document.querySelector("#game-shell"),
  missionStatusLabel: document.querySelector("#mission-status-label"),
  missionModeBadge: document.querySelector("#mission-mode-badge"),
  missionProgressValue: document.querySelector("#mission-progress-value"),
  scoreValue: document.querySelector("#score-value"),
  comboValue: document.querySelector("#combo-value"),
  timeValue: document.querySelector("#time-value"),
  timeBarFill: document.querySelector("#time-bar-fill"),
  raceSceneVisual: document.querySelector("#race-scene-visual"),
  raceProgressFill: document.querySelector("#race-progress-fill"),
  rocketShip: document.querySelector("#rocket-ship"),
  raceDistanceLabel: document.querySelector("#race-distance-label"),
  raceTimeLabel: document.querySelector("#race-time-label"),
  questionTrack: document.querySelector("#question-track"),
  questionCaption: document.querySelector("#question-caption"),
  questionHint: document.querySelector("#question-hint"),
  questionExpression: document.querySelector("#question-expression"),
  questionHelper: document.querySelector("#question-helper"),
  answerForm: document.querySelector("#answer-form"),
  answerInput: document.querySelector("#answer-input"),
  submitAnswerButton: document.querySelector("#submit-answer-button"),
  clearAnswerButton: document.querySelector("#clear-answer-button"),
  restartMissionButton: document.querySelector("#restart-mission-button"),
  missionFeedback: document.querySelector("#mission-feedback"),
  bestStreakValue: document.querySelector("#best-streak-value"),
  recentResults: document.querySelector("#recent-results"),
  summaryPanel: document.querySelector("#summary-panel"),
  summaryTitle: document.querySelector("#summary-title"),
  summaryText: document.querySelector("#summary-text"),
  summaryScoreValue: document.querySelector("#summary-score-value"),
  summaryAccuracyValue: document.querySelector("#summary-accuracy-value"),
  summaryFirstTryValue: document.querySelector("#summary-first-try-value"),
  summaryStreakValue: document.querySelector("#summary-streak-value"),
  summaryTimeValue: document.querySelector("#summary-time-value"),
  summaryActionButton: document.querySelector("#summary-action-button"),
};

function applyBrandName() {
  const brandName = window.APP_CONFIG?.brandName ?? "SchoolTools";

  document.querySelectorAll("[data-brand-name]").forEach((element) => {
    element.textContent = brandName;
  });

  document.title = `Tabliczka mnożenia - ${brandName}`;
}

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function isAssignmentMode() {
  return state.mode === "assignment";
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

function getCurrentSettings() {
  return normalizeSettings({
    maxFactor: state.maxFactor,
    questionCount: state.questionCount,
    timeLimitSeconds: state.timeLimitSeconds,
  });
}

function syncToolbarSelections() {
  const settings = getCurrentSettings();
  state.maxFactor = settings.maxFactor;
  state.questionCount = settings.questionCount;
  state.timeLimitSeconds = settings.timeLimitSeconds;
  elements.maxFactorSelect.value = String(settings.maxFactor);
  elements.questionCountSelect.value = String(settings.questionCount);
  elements.timeLimitSelect.value = String(settings.timeLimitSeconds);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function clampRatio(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function getPreciseTimeLeftSeconds() {
  if (state.missionDeadlineAt > 0) {
    return Math.max(0, (state.missionDeadlineAt - Date.now()) / 1000);
  }

  return Math.max(0, Number(state.timeLeft) || 0);
}

function getTimeRatio() {
  if (state.timeLimitSeconds <= 0) {
    return 1;
  }

  return clampRatio(getPreciseTimeLeftSeconds() / state.timeLimitSeconds);
}

function clearRocketBoost() {
  state.boostLevel = 0;

  if (state.boostTimeoutId) {
    window.clearTimeout(state.boostTimeoutId);
    state.boostTimeoutId = null;
  }
}

function triggerRocketBoost() {
  clearRocketBoost();
  state.boostLevel = 1;
  renderStats();

  state.boostTimeoutId = window.setTimeout(() => {
    state.boostLevel = 0;
    state.boostTimeoutId = null;
    renderStats();
  }, 520);
}

function updateAssignmentProgress() {
  if (!isAssignmentMode() || !state.assignmentConfig) {
    return;
  }

  const requiredSuccesses = Number(
    state.assignmentConfig.settings?.requiredSuccesses || 1,
  );

  elements.assignmentProgressValue.textContent =
    `${state.completedRounds} / ${requiredSuccesses}`;
}

function renderDashboardHeader() {
  if (isAssignmentMode()) {
    const requiredSuccesses = Number(
      state.assignmentConfig?.settings?.requiredSuccesses || 1,
    );
    const nextMissionNumber = Math.min(state.completedRounds + 1, requiredSuccesses);
    elements.missionStatusLabel.textContent =
      `Misja ${nextMissionNumber} z ${requiredSuccesses}`;
    elements.missionModeBadge.textContent = "Tryb zadania";
    return;
  }

  elements.missionStatusLabel.textContent = "Trening swobodny";
  elements.missionModeBadge.textContent = "Tryb wolny";
}

function renderStats() {
  const totalQuestions = state.mission?.questions.length || state.questionCount;
  const solvedQuestions = state.questionStates.filter((item) => item.completed).length;
  const percentLeft = getTimeRatio() * 100;

  elements.missionProgressValue.textContent =
    `${solvedQuestions} / ${totalQuestions}`;
  elements.scoreValue.textContent = String(state.score);
  elements.comboValue.textContent = String(state.streak);
  elements.timeValue.textContent = formatTime(state.timeLeft);
  elements.timeBarFill.style.width = `${percentLeft}%`;
  elements.bestStreakValue.textContent =
    `Najlepsza seria: ${state.bestStreak}`;

  renderRaceScene({
    totalQuestions,
    solvedQuestions,
  });
}

function renderRaceScene(context) {
  if (!elements.raceSceneVisual) {
    return;
  }

  const totalQuestions = Math.max(1, Number(context?.totalQuestions) || 1);
  const solvedQuestions = Math.max(0, Number(context?.solvedQuestions) || 0);
  const solvedRatio = clampRatio(solvedQuestions / totalQuestions);
  const timeRatio = getTimeRatio();
  const elapsedRatio = clampRatio(1 - timeRatio);
  const progressRatio =
    state.missionStatus === "completed"
      ? 1
      : clampRatio(elapsedRatio * 0.42 + solvedRatio * 0.58);
  const timePressure = clampRatio(1 - timeRatio);
  const urgency =
    timeRatio > 0.55 ? "calm" : timeRatio > 0.25 ? "medium" : "high";
  const enginePower = clampRatio(
    0.42 + state.streak * 0.08 + timePressure * 0.22 + state.boostLevel * 0.38,
  );
  const liftOffset =
    state.missionStatus === "failed"
      ? 8
      : state.missionStatus === "completed"
        ? -10
        : state.boostLevel > 0
          ? -10
          : state.streak >= 4
            ? -6
            : state.currentQuestionAttemptCount > 0
              ? 4
              : -2;
  const tiltDeg =
    state.missionStatus === "failed"
      ? 12
      : state.missionStatus === "completed"
        ? -4
        : state.boostLevel > 0
          ? -10
          : state.currentQuestionAttemptCount > 0
            ? 2
            : -4;

  elements.raceSceneVisual.dataset.state = state.missionStatus;
  elements.raceSceneVisual.dataset.urgency = urgency;
  elements.raceSceneVisual.style.setProperty(
    "--rocket-progress",
    progressRatio.toFixed(3),
  );
  elements.raceSceneVisual.style.setProperty(
    "--rocket-lift",
    `${liftOffset}px`,
  );
  elements.raceSceneVisual.style.setProperty(
    "--rocket-tilt",
    `${tiltDeg}deg`,
  );
  elements.raceSceneVisual.style.setProperty(
    "--engine-power",
    enginePower.toFixed(3),
  );
  elements.raceSceneVisual.style.setProperty(
    "--time-pressure",
    timePressure.toFixed(3),
  );

  if (elements.raceProgressFill) {
    elements.raceProgressFill.style.setProperty(
      "--rocket-progress",
      progressRatio.toFixed(3),
    );
  }

  const progressPercent = Math.round(progressRatio * 100);

  if (state.missionStatus === "completed") {
    elements.raceDistanceLabel.textContent = "Rakieta doleciała do mety!";
    elements.raceTimeLabel.textContent =
      `Zapas czasu na mecie: ${formatTime(state.timeLeft)}.`;
    return;
  }

  if (state.missionStatus === "failed") {
    elements.raceDistanceLabel.textContent =
      `Rakieta dotarła do ${progressPercent}% trasy.`;
    elements.raceTimeLabel.textContent =
      "Paliwo czasu się skończyło. Jeszcze jedna próba i lecimy dalej.";
    return;
  }

  if (state.missionStatus === "running") {
    elements.raceDistanceLabel.textContent =
      `Rakieta pokonała ${progressPercent}% trasy do mety.`;

    if (urgency === "high") {
      elements.raceTimeLabel.textContent =
        `Zostało ${formatTime(state.timeLeft)}. Autopilot leci dalej, ale teraz najbardziej pomagają dopalacze z dobrych odpowiedzi.`;
      return;
    }

    if (state.boostLevel > 0) {
      elements.raceTimeLabel.textContent =
        `Zostało ${formatTime(state.timeLeft)}. Dopalacz z poprawnej odpowiedzi właśnie pchnął rakietę do przodu.`;
      return;
    }

    if (state.streak >= 4) {
      elements.raceTimeLabel.textContent =
        `Zostało ${formatTime(state.timeLeft)}. Świetna seria trzyma rakietę na mocnym ciągu.`;
      return;
    }

    elements.raceTimeLabel.textContent =
      `Zostało ${formatTime(state.timeLeft)}. Autopilot prowadzi lot, a każda dobra odpowiedź odpala turbo.`;
    return;
  }

  elements.raceDistanceLabel.textContent = "Rakieta czeka na start.";
  elements.raceTimeLabel.textContent =
    "Gdy zacznie się misja, lot ruszy razem z postępem.";
}

function renderQuestionTrack() {
  elements.questionTrack.innerHTML = "";

  state.questionStates.forEach((questionState, index) => {
    const marker = document.createElement("span");
    marker.className = "question-marker";
    marker.textContent = String(index + 1);

    if (questionState.completed) {
      marker.dataset.status = "success";
    } else if (index === state.currentQuestionIndex && state.missionStatus === "running") {
      marker.dataset.status = questionState.attempts > 0 ? "retry" : "current";
    }

    elements.questionTrack.append(marker);
  });
}

function renderCurrentQuestion() {
  const question = getCurrentQuestion();

  if (!question) {
    elements.questionCaption.textContent = "Misja zakończona";
    elements.questionExpression.textContent = "Gotowe";
    elements.questionHelper.textContent =
      "Sprawdź podsumowanie i rozpocznij kolejną misję.";
    return;
  }

  elements.questionCaption.textContent =
    `Przykład ${state.currentQuestionIndex + 1} z ${state.mission.questions.length}`;
  elements.questionExpression.textContent = `${question.left} × ${question.right}`;

  if (state.streak >= 4) {
    elements.questionHint.textContent =
      "Świetna seria. Kolejne poprawne odpowiedzi dają coraz większą premię.";
  } else {
    elements.questionHint.textContent =
      `Zakres ${getRangeLabel(state.maxFactor)}, ${state.questionCount} przykładów, ${state.timeLimitSeconds} s na misję.`;
  }

  if (state.currentQuestionAttemptCount > 0) {
    elements.questionHelper.textContent =
      "Spróbuj jeszcze raz. Pomyśl spokojnie o wyniku i wpisz odpowiedź.";
    return;
  }

  elements.questionHelper.textContent =
    "Wpisz wynik i kliknij „Sprawdź”.";
}

function renderRecentResults() {
  elements.recentResults.innerHTML = "";

  if (state.recentResults.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "recent-results__empty";
    emptyState.textContent =
      "Tutaj pojawią się ostatnie odpowiedzi i zdobyte premie.";
    elements.recentResults.append(emptyState);
    return;
  }

  state.recentResults.slice(-4).reverse().forEach((entry) => {
    const item = document.createElement("div");
    item.className = "recent-result";
    item.dataset.status = entry.status;

    const label = document.createElement("strong");
    label.textContent = `${entry.left} × ${entry.right}`;

    const detail = document.createElement("span");

    if (entry.status === "success") {
      detail.textContent = `= ${entry.product}  •  +${entry.points} pkt`;
    } else {
      detail.textContent = "spróbuj jeszcze raz";
    }

    item.append(label, detail);
    elements.recentResults.append(item);
  });
}

function hideSummary() {
  elements.summaryPanel.hidden = true;
}

function renderSummary(summary) {
  elements.summaryPanel.hidden = false;
  elements.summaryTitle.textContent = summary.headline;
  elements.summaryText.textContent = summary.message;
  elements.summaryScoreValue.textContent = String(summary.score);
  elements.summaryAccuracyValue.textContent = `${summary.accuracyPercent}%`;
  elements.summaryFirstTryValue.textContent = `${summary.firstTryPercent}%`;
  elements.summaryStreakValue.textContent = String(summary.bestStreak);
  elements.summaryTimeValue.textContent = `${summary.remainingSeconds} s`;

  if (summary.failed) {
    elements.summaryActionButton.textContent = "Spróbuj jeszcze raz";
    elements.summaryActionButton.hidden = false;
    return;
  }

  if (!isAssignmentMode()) {
    elements.summaryActionButton.textContent = "Nowa misja";
    elements.summaryActionButton.hidden = false;
    return;
  }

  const requiredSuccesses = Number(
    state.assignmentConfig?.settings?.requiredSuccesses || 1,
  );
  const isWholeAssignmentCompleted = state.completedRounds >= requiredSuccesses;

  if (isWholeAssignmentCompleted) {
    elements.summaryActionButton.hidden = true;
    return;
  }

  elements.summaryActionButton.textContent = "Następna misja";
  elements.summaryActionButton.hidden = false;
}

function setMissionControlsEnabled(isEnabled) {
  elements.answerInput.disabled = !isEnabled;
  elements.submitAnswerButton.disabled = !isEnabled;
  elements.clearAnswerButton.disabled = !isEnabled;
  elements.restartMissionButton.disabled = !isEnabled;
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function focusAnswerInput() {
  if (elements.answerInput.disabled) {
    return;
  }

  elements.answerInput.focus();
  elements.answerInput.select();
}

function startTimer() {
  stopTimer();
  state.timeLeft = Math.ceil(getPreciseTimeLeftSeconds());

  state.timerId = window.setInterval(() => {
    const preciseTimeLeft = getPreciseTimeLeftSeconds();
    state.timeLeft = Math.ceil(preciseTimeLeft);
    renderStats();

    if (preciseTimeLeft <= 0) {
      handleMissionFailed();
    }
  }, 160);
}

function resetMissionState() {
  clearRocketBoost();
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.totalAttempts = 0;
  state.firstTryCorrectCount = 0;
  state.currentQuestionIndex = 0;
  state.currentQuestionAttemptCount = 0;
  state.recentResults = [];
  state.lastSummary = null;
  state.questionStates = state.mission.questions.map(() => ({
    attempts: 0,
    completed: false,
  }));
}

function renderRunningState() {
  renderDashboardHeader();
  renderStats();
  renderQuestionTrack();
  renderCurrentQuestion();
  renderRecentResults();
  setMissionControlsEnabled(true);
  hideSummary();
}

function startMission() {
  stopTimer();
  syncToolbarSelections();
  state.mission = createMission(getCurrentSettings());
  state.missionStartedAt = Date.now();
  state.missionDeadlineAt =
    state.missionStartedAt + state.timeLimitSeconds * 1000;
  state.timeLeft = state.timeLimitSeconds;
  state.missionStatus = "running";

  if (isAssignmentMode()) {
    state.attemptIndex += 1;
  }

  resetMissionState();
  elements.answerInput.value = "";
  elements.gameShell.hidden = false;
  renderRunningState();
  renderFeedback(
    elements.missionFeedback,
    "Odpowiedz na wszystkie przykłady, zanim skończy się czas.",
    "default",
  );
  startTimer();
  focusAnswerInput();
}

function pushRecentResult(entry) {
  state.recentResults.push(entry);

  if (state.recentResults.length > 8) {
    state.recentResults = state.recentResults.slice(-8);
  }
}

function moveToNextQuestion() {
  state.currentQuestionIndex += 1;
  state.currentQuestionAttemptCount = 0;
  elements.answerInput.value = "";
  renderStats();
  renderQuestionTrack();
  renderCurrentQuestion();
  renderRecentResults();
  focusAnswerInput();
}

async function submitCompletedAssignmentIfNeeded() {
  if (!isAssignmentMode() || !state.assignmentApi || !state.currentStudent) {
    return;
  }

  const requiredSuccesses = Number(
    state.assignmentConfig?.settings?.requiredSuccesses || 1,
  );

  if (state.completedRounds < requiredSuccesses) {
    return;
  }

  await state.assignmentApi.submitAssignmentAttempt({
    assignmentId: state.assignmentId,
    studentName: state.currentStudent,
    attemptIndex: state.attemptIndex,
    placementCorrect: true,
    readingCorrect: true,
    completedRounds: state.completedRounds,
    completed: true,
  });
}

async function handleMissionCompleted() {
  stopTimer();
  clearRocketBoost();
  state.missionStatus = "completed";
  state.timeLeft = Math.ceil(getPreciseTimeLeftSeconds());
  setMissionControlsEnabled(false);
  renderStats();

  const summary = createMissionSummary({
    totalQuestions: state.mission.questions.length,
    solvedQuestions: state.mission.questions.length,
    totalAttempts: state.totalAttempts,
    firstTryCorrectCount: state.firstTryCorrectCount,
    score: state.score,
    bestStreak: state.bestStreak,
    remainingSeconds: state.timeLeft,
    failed: false,
  });

  state.lastSummary = summary;
  renderSummary(summary);
  renderFeedback(
    elements.missionFeedback,
    `Brawo! Misja ukończona z wynikiem ${summary.score} punktów.`,
    "success",
  );

  if (!isAssignmentMode()) {
    return;
  }

  state.completedRounds += 1;
  updateAssignmentProgress();

  const requiredSuccesses = Number(
    state.assignmentConfig?.settings?.requiredSuccesses || 1,
  );
  const remainingMissions = Math.max(0, requiredSuccesses - state.completedRounds);

  try {
    await submitCompletedAssignmentIfNeeded();
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się zapisać wyniku. ${error.message}`,
      "warning",
    );
    return;
  }

  if (remainingMissions === 0) {
    renderAssignmentFeedback(
      `Brawo, ${state.currentStudent}! Ukończono całe zadanie.`,
      "success",
    );
    return;
  }

  renderAssignmentFeedback(
    `Misja zaliczona. Zostało jeszcze ${remainingMissions} misji.`,
    "success",
  );
}

function handleMissionFailed() {
  stopTimer();
  clearRocketBoost();
  state.missionStatus = "failed";
  state.timeLeft = 0;
  setMissionControlsEnabled(false);
  renderStats();

  const solvedQuestions = state.questionStates.filter((item) => item.completed).length;
  const summary = createMissionSummary({
    totalQuestions: state.mission.questions.length,
    solvedQuestions,
    totalAttempts: state.totalAttempts,
    firstTryCorrectCount: state.firstTryCorrectCount,
    score: state.score,
    bestStreak: state.bestStreak,
    remainingSeconds: state.timeLeft,
    failed: true,
  });

  state.lastSummary = summary;
  renderSummary(summary);
  renderFeedback(
    elements.missionFeedback,
    "Czas minął. Spróbuj jeszcze raz i utrzymaj rytm do samego końca.",
    "warning",
  );

  if (isAssignmentMode()) {
    renderAssignmentFeedback(
      "Ta misja nie została jeszcze zaliczona. Możesz spróbować ponownie.",
      "warning",
    );
  }
}

async function handleAnswerSubmit(event) {
  event.preventDefault();

  if (state.missionStatus !== "running") {
    return;
  }

  const question = getCurrentQuestion();

  if (!question) {
    return;
  }

  const result = checkAnswer(question, elements.answerInput.value);

  if (!result.isValid) {
    renderFeedback(elements.missionFeedback, result.message, "warning");
    focusAnswerInput();
    return;
  }

  state.currentQuestionAttemptCount += 1;
  state.totalAttempts += 1;
  state.questionStates[state.currentQuestionIndex].attempts =
    state.currentQuestionAttemptCount;

  if (!result.isCorrect) {
    state.streak = 0;
    pushRecentResult({
      left: question.left,
      right: question.right,
      product: question.product,
      status: "warning",
    });
    renderRecentResults();
    renderQuestionTrack();
    renderCurrentQuestion();

    state.missionDeadlineAt = Math.max(
      Date.now(),
      state.missionDeadlineAt - getPenaltySeconds() * 1000,
    );
    state.timeLeft = Math.ceil(getPreciseTimeLeftSeconds());
    renderStats();

    renderFeedback(
      elements.missionFeedback,
      `${result.message} Pomyśl jeszcze o ${question.left} × ${question.right}.`,
      "warning",
    );

    if (getPreciseTimeLeftSeconds() <= 0) {
      handleMissionFailed();
      return;
    }

    elements.answerInput.value = "";
    focusAnswerInput();
    return;
  }

  if (state.currentQuestionAttemptCount === 1) {
    state.firstTryCorrectCount += 1;
  }

  state.questionStates[state.currentQuestionIndex].completed = true;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);

  const earnedPoints = getPointsForCorrectAnswer({
    secondsLeft: state.timeLeft,
    streak: state.streak,
  });

  state.score += earnedPoints;
  pushRecentResult({
    left: question.left,
    right: question.right,
    product: question.product,
    status: "success",
    points: earnedPoints,
  });
  triggerRocketBoost();
  renderRecentResults();
  renderStats();
  renderQuestionTrack();

  renderFeedback(
    elements.missionFeedback,
    `Dobrze! Świetna robota. Zdobywasz ${earnedPoints} punktów.`,
    "success",
  );

  if (state.currentQuestionIndex === state.mission.questions.length - 1) {
    await handleMissionCompleted();
    return;
  }

  moveToNextQuestion();
}

function applyAssignmentConfig(config) {
  state.assignmentConfig = config;

  const settings = normalizeSettings({
    maxFactor: config.settings?.maxFactor,
    questionCount: config.settings?.questionCount,
    timeLimitSeconds: config.settings?.timeLimitSeconds,
  });

  state.maxFactor = settings.maxFactor;
  state.questionCount = settings.questionCount;
  state.timeLimitSeconds = settings.timeLimitSeconds;
  syncToolbarSelections();

  elements.assignmentTitle.textContent = config.title || "Zadanie nauczyciela";
  elements.assignmentDescription.textContent =
    config.settings?.studentInstructions ||
    "Ukończ wszystkie misje z tabliczki mnożenia, zanim skończy się czas.";
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
  state.completedRounds = 0;
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
      `Powodzenia, ${state.currentStudent}. Rozpoczynasz pierwszą misję.`,
      "default",
    );
    startMission();
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

    if (response.assignment?.tool !== "multiplication-game") {
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
      "default",
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

function handleSummaryAction() {
  startMission();
}

function registerEvents() {
  elements.maxFactorSelect.addEventListener("change", (event) => {
    state.maxFactor = Number(event.target.value);
    startMission();
  });

  elements.questionCountSelect.addEventListener("change", (event) => {
    state.questionCount = Number(event.target.value);
    startMission();
  });

  elements.timeLimitSelect.addEventListener("change", (event) => {
    state.timeLimitSeconds = Number(event.target.value);
    startMission();
  });

  elements.newMissionButton.addEventListener("click", startMission);
  elements.answerForm.addEventListener("submit", handleAnswerSubmit);
  elements.clearAnswerButton.addEventListener("click", () => {
    elements.answerInput.value = "";
    focusAnswerInput();
  });
  elements.restartMissionButton.addEventListener("click", startMission);
  elements.summaryActionButton.addEventListener("click", handleSummaryAction);
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
  renderStats();
  renderRecentResults();

  const startedAssignmentMode = await initializeAssignmentMode();

  if (!startedAssignmentMode) {
    elements.gameShell.hidden = false;
    startMission();
  }
}

initializeApp();
