const {
  applyOperationToEquation,
  cloneEquation,
  createTask,
  createTaskFromSheetRow,
  formatEquationAsLatex,
  getEquationStatus,
  validateArrangement,
} = window.LinearEquationsMath;

const state = {
  mode: "free",
  difficulty: "easy",
  taskGroup: "",
  activeSide: "left",
  task: null,
  placedLeftIds: [],
  placedRightIds: [],
  currentEquation: null,
  history: [],
  isArrangementSolved: false,
  isEquationFinished: false,
  taskSource: "local",
  assignmentId: "",
  assignmentApi: null,
  assignmentConfig: null,
  currentStudent: "",
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
  toolbar: document.querySelector(".toolbar"),
  layout: document.querySelector("#layout"),
  difficultySelect: document.querySelector("#difficulty-select"),
  newTaskButton: document.querySelector("#new-task-button"),
  resetBuildButton: document.querySelector("#reset-build-button"),
  clearLeftButton: document.querySelector("#clear-left-button"),
  clearRightButton: document.querySelector("#clear-right-button"),
  targetLeftButton: document.querySelector("#target-left-button"),
  targetRightButton: document.querySelector("#target-right-button"),
  stageOnePanel: document.querySelector("#stage-one-panel"),
  stageTwoPanel: document.querySelector("#stage-two-panel"),
  tilePool: document.querySelector("#tile-pool"),
  leftBuildList: document.querySelector("#left-build-list"),
  rightBuildList: document.querySelector("#right-build-list"),
  checkBuildButton: document.querySelector("#check-build-button"),
  buildFeedback: document.querySelector("#build-feedback"),
  sourceEquation: document.querySelector("#source-equation"),
  originalEquation: document.querySelector("#original-equation"),
  currentEquation: document.querySelector("#current-equation"),
  operationSelect: document.querySelector("#operation-select"),
  monomialInput: document.querySelector("#monomial-input"),
  applyOperationButton: document.querySelector("#apply-operation-button"),
  undoStepButton: document.querySelector("#undo-step-button"),
  operationFeedback: document.querySelector("#operation-feedback"),
  historyList: document.querySelector("#history-list"),
};

function applyBrandName() {
  const brandName = window.APP_CONFIG?.brandName ?? "SchoolTools";

  document.querySelectorAll("[data-brand-name]").forEach((element) => {
    element.textContent = brandName;
  });

  document.title = `Równania liniowe - ${brandName}`;
}

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function isAssignmentMode() {
  return state.mode === "assignment";
}

function renderKatex(element, latex, fallbackText = "") {
  if (!element) {
    return;
  }

  if (window.katex) {
    window.katex.render(latex, element, { throwOnError: false });
    return;
  }

  element.textContent = fallbackText || latex;
}

function renderTileLabel(element, tile) {
  if (!element || !tile) {
    return;
  }

  if (tile.latex) {
    renderKatex(element, tile.latex, tile.label);
    return;
  }

  element.textContent = tile.label;
}

function renderFeedback(element, message, status = "default") {
  if (!element) {
    return;
  }

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

function getTileById(tileId) {
  return state.task?.poolTiles.find((tile) => tile.id === tileId) || null;
}

function isTilePlaced(tileId) {
  return (
    state.placedLeftIds.includes(tileId) || state.placedRightIds.includes(tileId)
  );
}

function resetArrangement() {
  state.placedLeftIds = [];
  state.placedRightIds = [];
  state.currentEquation = null;
  state.history = [];
  state.isArrangementSolved = false;
  state.isEquationFinished = false;
  elements.monomialInput.value = "";
}

function renderStageVisibility() {
  elements.stageOnePanel.hidden = state.isArrangementSolved;
  elements.stageTwoPanel.hidden = !state.isArrangementSolved;
}

async function loadTaskForDifficulty(difficulty, group = "") {
  const apiUrl = window.APP_CONFIG?.assignmentsApiUrl ?? "";

  if (!apiUrl || !window.createAssignmentApiClient) {
    return {
      task: createTask(difficulty),
      source: "local",
    };
  }

  try {
    const api = window.createAssignmentApiClient({ apiUrl });
    const response = await api.getLinearEquationTask(difficulty, group);

    return {
      task: createTaskFromSheetRow(response.task),
      source: "sheet",
    };
  } catch (error) {
    return {
      task: createTask(difficulty),
      source: "local",
      error,
    };
  }
}

function renderTaskInfo() {
  elements.difficultySelect.value = state.difficulty;
}

function renderTargetButtons() {
  elements.targetLeftButton.setAttribute(
    "aria-pressed",
    String(state.activeSide === "left"),
  );
  elements.targetRightButton.setAttribute(
    "aria-pressed",
    String(state.activeSide === "right"),
  );
}

function renderTilePool() {
  elements.tilePool.innerHTML = "";

  if (!state.task) {
    return;
  }

  state.task.poolTiles.forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.disabled = isTilePlaced(tile.id) || state.isArrangementSolved;
    button.dataset.tileId = tile.id;
    button.addEventListener("click", () => handleTilePick(tile.id));

    const label = document.createElement("span");
    renderTileLabel(label, tile);
    button.append(label);

    elements.tilePool.append(button);
  });
}

function createPlacedTile(tileId, side) {
  const tile = getTileById(tileId);
  const wrapper = document.createElement("div");
  wrapper.className = "build-tile-stack";

  const card = document.createElement("button");
  card.type = "button";
  card.className = "build-tile";
  card.disabled = state.isArrangementSolved;
  card.setAttribute("aria-label", `Usuń klocek ${tile.label}`);
  card.title = "Kliknij, aby usunąć klocek";
  card.addEventListener("click", () => removePlacedTile(side, tileId));

  const label = document.createElement("span");
  label.className = "build-tile__label";
  renderTileLabel(label, tile);
  card.append(label);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "build-tile__remove";
  removeButton.textContent = "Usuń";
  removeButton.disabled = state.isArrangementSolved;
  removeButton.setAttribute("aria-label", `Usuń klocek ${tile.label}`);
  removeButton.addEventListener("click", () => removePlacedTile(side, tileId));

  wrapper.append(card, removeButton);
  return wrapper;
}

function createBuildSeparator() {
  const separator = document.createElement("span");
  separator.className = "build-separator";
  separator.setAttribute("aria-hidden", "true");
  separator.textContent = "+";
  return separator;
}

function renderBuildSide(container, tileIds, side) {
  tileIds.forEach((tileId, index) => {
    container.append(createPlacedTile(tileId, side));

    if (index < tileIds.length - 1) {
      container.append(createBuildSeparator());
    }
  });
}

function renderBuildLists() {
  elements.leftBuildList.innerHTML = "";
  elements.rightBuildList.innerHTML = "";

  renderBuildSide(elements.leftBuildList, state.placedLeftIds, "left");
  renderBuildSide(elements.rightBuildList, state.placedRightIds, "right");
}

function renderEquationCards() {
  if (!state.task) {
    return;
  }

  renderKatex(elements.sourceEquation, state.task.originalEquationLatex);
  renderKatex(elements.originalEquation, state.task.originalEquationLatex);

  if (!state.isArrangementSolved || !state.currentEquation) {
    elements.currentEquation.textContent =
      "Po etapie 1 pojawi się tutaj uproszczone równanie, od którego zaczniesz rozwiązanie.";
    return;
  }

  renderKatex(
    elements.currentEquation,
    formatEquationAsLatex(state.currentEquation),
  );
}

function renderHistory() {
  elements.historyList.innerHTML = "";

  if (state.history.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "history__item";
    emptyItem.textContent = "Nie ma jeszcze zapisanych kroków.";
    elements.historyList.append(emptyItem);
    return;
  }

  state.history.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "history__item";

    const title = document.createElement("p");
    title.className = "history__item-title";
    title.textContent = `Krok ${index + 1}: ${entry.operationLabel}`;

    const before = document.createElement("div");
    before.className = "history__formula";
    renderKatex(before, entry.beforeLatex, entry.beforeLatex);

    const arrow = document.createElement("p");
    arrow.className = "history__arrow";
    arrow.textContent = "po operacji";

    const after = document.createElement("div");
    after.className = "history__formula";
    renderKatex(after, entry.afterLatex, entry.afterLatex);

    item.append(title, before, arrow, after);
    elements.historyList.append(item);
  });
}

function updateOperationAvailability() {
  const canApplyOperation =
    state.isArrangementSolved && !state.isEquationFinished && Boolean(state.currentEquation);
  const hasHistory = state.history.length > 0;

  elements.operationSelect.disabled = !canApplyOperation;
  elements.monomialInput.disabled = !canApplyOperation;
  elements.applyOperationButton.disabled = !canApplyOperation;
  elements.undoStepButton.disabled = !hasHistory;
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

function getEquationFeedbackStatus(status) {
  if (status.type === "solved") {
    return "success";
  }

  if (status.type === "identity" || status.type === "contradiction") {
    return "warning";
  }

  return "default";
}

function isEquationResolved(status) {
  return (
    status.type === "solved" ||
    status.type === "identity" ||
    status.type === "contradiction"
  );
}

async function submitAssignmentProgress(completed) {
  if (!state.assignmentApi || !state.currentStudent) {
    return;
  }

  await state.assignmentApi.submitAssignmentAttempt({
    assignmentId: state.assignmentId,
    studentName: state.currentStudent,
    attemptIndex: state.attemptIndex,
    placementCorrect: state.isArrangementSolved,
    readingCorrect: state.isEquationFinished,
    completedRounds: state.completedRounds,
    completed,
  });
}

async function loadNextAssignmentTask() {
  state.attemptIndex += 1;
  await buildNewTask();
  elements.layout.hidden = false;
}

async function handleAssignmentTaskCompleted() {
  state.completedRounds += 1;
  updateAssignmentProgress();

  const requiredSuccesses = Number(
    state.assignmentConfig.settings?.requiredSuccesses || 1,
  );
  const completed = state.completedRounds >= requiredSuccesses;

  try {
    await submitAssignmentProgress(completed);
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się zapisać postępu. ${error.message}`,
      "warning",
    );
  }

  if (completed) {
    elements.layout.hidden = true;
    renderAssignmentFeedback(
      `Brawo, ${state.currentStudent}! Zadanie zostało ukończone.`,
      "success",
    );
    return;
  }

  renderAssignmentFeedback(
    `Ćwiczenie zaliczone. Zostało jeszcze ${requiredSuccesses - state.completedRounds} ćwiczeń.`,
    "success",
  );

  await loadNextAssignmentTask();
}

function handleTilePick(tileId) {
  if (state.isArrangementSolved || isTilePlaced(tileId)) {
    return;
  }

  const targetList =
    state.activeSide === "left" ? state.placedLeftIds : state.placedRightIds;

  targetList.push(tileId);
  renderTilePool();
  renderBuildLists();
}

function removePlacedTile(side, tileId) {
  if (state.isArrangementSolved) {
    return;
  }

  const list = side === "left" ? state.placedLeftIds : state.placedRightIds;
  const tileIndex = list.indexOf(tileId);

  if (tileIndex === -1) {
    return;
  }

  const nextList = [...list];
  nextList.splice(tileIndex, 1);

  if (side === "left") {
    state.placedLeftIds = nextList;
  } else {
    state.placedRightIds = nextList;
  }

  renderTilePool();
  renderBuildLists();
}

function clearSide(side) {
  if (state.isArrangementSolved) {
    return;
  }

  if (side === "left") {
    state.placedLeftIds = [];
  } else {
    state.placedRightIds = [];
  }

  renderTilePool();
  renderBuildLists();
}

async function handleArrangementCheck() {
  const result = validateArrangement(
    state.task,
    state.placedLeftIds,
    state.placedRightIds,
  );

  if (!result.isCorrect) {
    const messages = [];

    if (!result.leftMatches) {
      messages.push("lewa strona wymaga jeszcze poprawy");
    }

    if (!result.rightMatches) {
      messages.push("prawa strona wymaga jeszcze poprawy");
    }

    if (result.extraCount > 0) {
      messages.push("sprawdź dobór jednomianów");
    }

    if (result.missingCount > 0) {
      messages.push("na jednej ze stron brakuje części uproszczenia");
    }

    renderFeedback(
      elements.buildFeedback,
      `Jeszcze nie. Sprawdź jeszcze raz uproszczenie: ${messages.join(", ")}.`,
      "warning",
    );
    return;
  }

  state.isArrangementSolved = true;
  state.currentEquation = cloneEquation(state.task.currentEquation);
  state.isEquationFinished = false;
  renderStageVisibility();
  renderTilePool();
  renderBuildLists();
  renderEquationCards();
  renderHistory();

  const status = getEquationStatus(state.currentEquation);
  state.isEquationFinished = isEquationResolved(status);
  updateOperationAvailability();
  renderFeedback(
    elements.operationFeedback,
    status.type === "ongoing"
      ? "Dobrze! Masz już poprawnie uproszczone równanie. Zacznij od pierwszej operacji po obu stronach."
      : status.message,
    getEquationFeedbackStatus(status),
  );

  if (state.isEquationFinished && isAssignmentMode()) {
    await handleAssignmentTaskCompleted();
  }
}

async function handleApplyOperation() {
  if (!state.isArrangementSolved || !state.currentEquation || state.isEquationFinished) {
    return;
  }

  const result = applyOperationToEquation(
    state.currentEquation,
    elements.operationSelect.value,
    elements.monomialInput.value,
  );

  if (!result.isValid) {
    renderFeedback(elements.operationFeedback, result.message, "warning");
    return;
  }

  state.history.push({
    beforeLatex: result.beforeLatex,
    afterLatex: result.afterLatex,
    operationLabel: result.operationLabel,
    previousEquation: cloneEquation(state.currentEquation),
  });
  state.currentEquation = result.nextEquation;
  elements.monomialInput.value = "";
  renderEquationCards();
  renderHistory();

  const status = getEquationStatus(state.currentEquation);
  state.isEquationFinished = isEquationResolved(status);
  updateOperationAvailability();
  renderFeedback(
    elements.operationFeedback,
    status.message,
    getEquationFeedbackStatus(status),
  );

  if (state.isEquationFinished && isAssignmentMode()) {
    await handleAssignmentTaskCompleted();
  }
}

function handleUndoStep() {
  const lastEntry = state.history.pop();

  if (!lastEntry) {
    updateOperationAvailability();
    return;
  }

  state.currentEquation = cloneEquation(lastEntry.previousEquation);
  state.isEquationFinished = false;
  renderEquationCards();
  renderHistory();
  updateOperationAvailability();
  renderFeedback(
    elements.operationFeedback,
    "Cofnięto ostatni krok. Możesz spróbować innej operacji.",
    "default",
  );
}

async function buildNewTask() {
  const taskLoadResult = await loadTaskForDifficulty(
    state.difficulty,
    state.taskGroup,
  );

  state.task = taskLoadResult.task;
  state.taskSource = taskLoadResult.source;
  resetArrangement();
  renderTaskInfo();
  renderStageVisibility();
  renderTargetButtons();
  renderTilePool();
  renderBuildLists();
  renderEquationCards();
  renderHistory();
  renderFeedback(
    elements.buildFeedback,
    taskLoadResult.source === "sheet"
      ? "Najpierw uprość obie strony równania z przygotowanej listy i ułóż z klocków jego prostszą postać."
      : "Najpierw uprość obie strony równania i ułóż z klocków jego prostszą postać.",
    "default",
  );
  renderFeedback(
    elements.operationFeedback,
    taskLoadResult.source === "local" && taskLoadResult.error
      ? "Nie udało się pobrać zadania z arkusza, więc pokazuję lokalne zadanie zapasowe."
      : "Po poprawnym uproszczeniu równania tutaj zobaczysz kolejne przekształcenia.",
    "default",
  );
  updateOperationAvailability();
}

function applyAssignmentConfig(config) {
  state.assignmentConfig = config;
  state.difficulty = String(config.settings?.difficulty || "easy").trim() || "easy";
  state.taskGroup = String(config.settings?.taskGroup || "").trim();

  elements.assignmentTitle.textContent = config.title || "Zadanie nauczyciela";
  elements.assignmentDescription.textContent =
    config.settings?.studentInstructions ||
    "Rozwiąż poprawnie wszystkie wymagane ćwiczenia.";
  updateAssignmentProgress();
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
    renderAssignmentFeedback(
      `Powodzenia, ${state.currentStudent}. Możesz zaczynać pierwsze ćwiczenie.`,
      "default",
    );
    await loadNextAssignmentTask();
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
  elements.layout.hidden = true;
  renderAssignmentFeedback("Trwa wczytywanie zadania...");

  try {
    state.assignmentApi = window.createAssignmentApiClient({ apiUrl });
    const response = await state.assignmentApi.getAssignment(assignmentId);

    if (response.assignment?.tool !== "linear-equations") {
      state.mode = "free";
      elements.assignmentPanel.hidden = true;
      elements.pageHeader.hidden = false;
      elements.toolbar.hidden = false;
      elements.layout.hidden = false;
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

function registerEvents() {
  elements.difficultySelect.addEventListener("change", async (event) => {
    state.difficulty = event.target.value;
    await buildNewTask();
  });

  elements.newTaskButton.addEventListener("click", async () => {
    await buildNewTask();
  });
  elements.resetBuildButton.addEventListener("click", () => {
    resetArrangement();
    renderStageVisibility();
    renderTilePool();
    renderBuildLists();
    renderEquationCards();
    renderHistory();
    updateOperationAvailability();
    renderFeedback(
      elements.buildFeedback,
      "Układanie uproszczonej postaci zostało wyczyszczone. Spróbuj jeszcze raz.",
      "default",
    );
    renderFeedback(
      elements.operationFeedback,
      "Po poprawnym uproszczeniu równania tutaj zobaczysz kolejne przekształcenia.",
      "default",
    );
  });
  elements.clearLeftButton.addEventListener("click", () => clearSide("left"));
  elements.clearRightButton.addEventListener("click", () => clearSide("right"));
  elements.targetLeftButton.addEventListener("click", () => {
    state.activeSide = "left";
    renderTargetButtons();
  });
  elements.targetRightButton.addEventListener("click", () => {
    state.activeSide = "right";
    renderTargetButtons();
  });
  elements.checkBuildButton.addEventListener("click", async () => {
    await handleArrangementCheck();
  });
  elements.applyOperationButton.addEventListener("click", async () => {
    await handleApplyOperation();
  });
  elements.undoStepButton.addEventListener("click", handleUndoStep);
  elements.startAssignmentButton.addEventListener(
    "click",
    startAssignmentForSelectedStudent,
  );
}

async function initializeApp() {
  applyBrandName();
  registerEvents();
  const startedAssignmentMode = await initializeAssignmentMode();

  if (!startedAssignmentMode) {
    await buildNewTask();
  }
}

initializeApp();
