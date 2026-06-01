const {
  DIFFICULTY_OPTIONS,
  applyOperationToEquation,
  cloneEquation,
  createTask,
  createTaskFromSheetRow,
  formatEquationAsLatex,
  getDifficultyMeta,
  getEquationStatus,
  validateArrangement,
} = window.LinearEquationsMath;

const state = {
  difficulty: "easy",
  taskGroup: "",
  activeSide: "left",
  task: null,
  placedLeftIds: [],
  placedRightIds: [],
  currentEquation: null,
  history: [],
  isArrangementSolved: false,
  taskSource: "local",
  assignmentId: "",
  assignmentApi: null,
  assignmentConfig: null,
};

const elements = {
  pageHeader: document.querySelector("#page-header"),
  toolbar: document.querySelector(".toolbar"),
  difficultySelect: document.querySelector("#difficulty-select"),
  newTaskButton: document.querySelector("#new-task-button"),
  resetBuildButton: document.querySelector("#reset-build-button"),
  clearLeftButton: document.querySelector("#clear-left-button"),
  clearRightButton: document.querySelector("#clear-right-button"),
  targetLeftButton: document.querySelector("#target-left-button"),
  targetRightButton: document.querySelector("#target-right-button"),
  taskTitle: document.querySelector("#task-title"),
  taskDescription: document.querySelector("#task-description"),
  difficultyBadge: document.querySelector("#difficulty-badge"),
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
  operationPanel: document.querySelector("#operation-panel"),
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

function renderTileLabel(element, tile, options = {}) {
  if (!element) {
    return;
  }

  const prefixLatex = options.prefixLatex || "";
  const prefixText = options.prefixText || "";

  if (tile.latex) {
    renderKatex(element, `${prefixLatex}${tile.latex}`, `${prefixText}${tile.label}`);
    return;
  }

  element.textContent = `${prefixText}${tile.label}`;
}

function renderFeedback(element, message, status = "default") {
  element.textContent = message;

  if (status === "default") {
    element.removeAttribute("data-status");
    return;
  }

  element.dataset.status = status;
}

function getTileById(tileId) {
  return state.task.poolTiles.find((tile) => tile.id === tileId) || null;
}

function isTilePlaced(tileId) {
  return (
    state.placedLeftIds.includes(tileId) || state.placedRightIds.includes(tileId)
  );
}

function resetArrangement() {
  state.placedLeftIds = [];
  state.placedRightIds = [];
  state.isArrangementSolved = false;
  state.currentEquation = null;
  state.history = [];
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

function renderTaskInfo() {
  const difficultyMeta = getDifficultyMeta(state.difficulty);
  elements.difficultySelect.value = state.difficulty;
  elements.taskTitle.textContent =
    state.assignmentConfig?.title || state.task.title;
  const groupText = state.task.group ? ` Grupa: ${state.task.group}.` : "";
  const assignmentInstructions =
    state.assignmentConfig?.settings?.studentInstructions || "";
  elements.taskDescription.textContent = assignmentInstructions
    ? `${difficultyMeta.description}${groupText} ${assignmentInstructions}`
    : `${difficultyMeta.description}${groupText} Etap 1: uprość równanie do sumy algebraicznej z jednomianów. Etap 2: rozwiązuj je krok po kroku. ${state.task.instructions}`;
  elements.difficultyBadge.textContent = difficultyMeta.label;
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

function applyAssignmentConfig(config) {
  state.assignmentConfig = config;
  state.difficulty = String(config.settings?.difficulty || "easy").trim() || "easy";
  state.taskGroup = String(config.settings?.taskGroup || "").trim();

  if (config.title) {
    elements.taskTitle.textContent = config.title;
  }

  if (config.settings?.studentInstructions) {
    elements.taskDescription.textContent = config.settings.studentInstructions;
  }
}

async function initializeAssignmentMode() {
  const params = getUrlParams();
  const assignmentId = params.get("a") || params.get("assignment");
  const apiUrl = window.APP_CONFIG?.assignmentsApiUrl || "";

  if (!assignmentId || !apiUrl || !window.createAssignmentApiClient) {
    return false;
  }

  try {
    state.assignmentId = assignmentId;
    state.assignmentApi = window.createAssignmentApiClient({ apiUrl });
    const response = await state.assignmentApi.getAssignment(assignmentId);

    if (response.assignment?.tool !== "linear-equations") {
      return false;
    }

    applyAssignmentConfig(response.assignment);
    elements.toolbar.hidden = true;
    return true;
  } catch (error) {
    renderFeedback(
      elements.operationFeedback,
      `Nie udało się wczytać ustawień zadania. ${error.message}`,
      "warning",
    );
    return false;
  }
}

function createTileButton(tile) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile";
  button.disabled = isTilePlaced(tile.id) || state.isArrangementSolved;
  button.dataset.tileId = tile.id;
  button.addEventListener("click", () => handleTilePick(tile.id));

  const label = document.createElement("span");
  renderTileLabel(label, tile);

  button.append(label);
  return button;
}

function renderTilePool() {
  elements.tilePool.innerHTML = "";
  state.task.poolTiles.forEach((tile) => {
    elements.tilePool.append(createTileButton(tile));
  });
}

function createPlacedTile(tileId, side, index) {
  const tile = getTileById(tileId);
  const wrapper = document.createElement("div");
  wrapper.className = "build-tile";

  const label = document.createElement("span");
  renderTileLabel(label, tile, {
    prefixLatex: `\\text{${index + 1}. }`,
    prefixText: `${index + 1}. `,
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "build-tile__remove";
  removeButton.textContent = "Usuń";
  removeButton.disabled = state.isArrangementSolved;
  removeButton.addEventListener("click", () => removePlacedTile(side, tileId));

  wrapper.append(label, removeButton);
  return wrapper;
}

function renderBuildLists() {
  elements.leftBuildList.innerHTML = "";
  elements.rightBuildList.innerHTML = "";

  state.placedLeftIds.forEach((tileId, index) => {
    elements.leftBuildList.append(createPlacedTile(tileId, "left", index));
  });

  state.placedRightIds.forEach((tileId, index) => {
    elements.rightBuildList.append(createPlacedTile(tileId, "right", index));
  });
}

function renderEquationCards() {
  renderKatex(elements.sourceEquation, state.task.originalEquationLatex);
  renderKatex(elements.originalEquation, state.task.originalEquationLatex);

  if (!state.isArrangementSolved) {
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
  const isEnabled = state.isArrangementSolved;
  const hasHistory = state.history.length > 0;

  elements.operationSelect.disabled = !isEnabled;
  elements.monomialInput.disabled = !isEnabled;
  elements.applyOperationButton.disabled = !isEnabled;
  elements.undoStepButton.disabled = !hasHistory;
}

function handleTilePick(tileId) {
  if (state.isArrangementSolved || isTilePlaced(tileId)) {
    return;
  }

  const targetList = state.activeSide === "left" ? state.placedLeftIds : state.placedRightIds;
  targetList.push(tileId);
  renderTilePool();
  renderBuildLists();
}

function removePlacedTile(side, tileId) {
  const list = side === "left" ? state.placedLeftIds : state.placedRightIds;
  const nextList = list.filter((currentId) => currentId !== tileId);

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

function handleArrangementCheck() {
  const result = validateArrangement(
    state.task,
    state.placedLeftIds,
    state.placedRightIds,
  );

  if (result.isCorrect) {
    state.isArrangementSolved = true;
    state.currentEquation = cloneEquation(state.task.currentEquation);
    renderStageVisibility();
    renderTilePool();
    renderBuildLists();
    renderEquationCards();
    renderHistory();
    updateOperationAvailability();
    renderFeedback(
      elements.operationFeedback,
      "Dobrze! Masz już poprawnie uproszczone równanie. Zacznij od pierwszej operacji po obu stronach.",
      "success",
    );
    return;
  }

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
}

function handleApplyOperation() {
  if (!state.isArrangementSolved || !state.currentEquation) {
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
  updateOperationAvailability();

  const status = getEquationStatus(state.currentEquation);
  const feedbackStatus =
    status.type === "solved"
      ? "success"
      : status.type === "contradiction" || status.type === "identity"
        ? "warning"
        : "default";
  renderFeedback(elements.operationFeedback, status.message, feedbackStatus);
}

function handleUndoStep() {
  const lastEntry = state.history.pop();

  if (!lastEntry) {
    updateOperationAvailability();
    return;
  }

  state.currentEquation = cloneEquation(lastEntry.previousEquation);
  renderEquationCards();
  renderHistory();
  updateOperationAvailability();
  renderFeedback(
    elements.operationFeedback,
    "Cofnięto ostatni krok. Możesz spróbować innej operacji.",
    "default",
  );
}

function registerEvents() {
  elements.difficultySelect.addEventListener("change", (event) => {
    state.difficulty = event.target.value;
    buildNewTask();
  });

  elements.newTaskButton.addEventListener("click", buildNewTask);
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
  elements.checkBuildButton.addEventListener("click", handleArrangementCheck);
  elements.applyOperationButton.addEventListener("click", handleApplyOperation);
  elements.undoStepButton.addEventListener("click", handleUndoStep);
}

async function initializeApp() {
  applyBrandName();
  registerEvents();
  await initializeAssignmentMode();
  await buildNewTask();
}

initializeApp();
