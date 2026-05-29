const {
  formatLabeledValuesAsLatex,
  generatePlacementTask,
  checkPlacementAnswer,
  generateReadingTask,
  checkReadingAnswer,
  getAxisLabelValues,
  getAllowedPointCount,
  getTickDisplayStep,
  getValueLabel,
  getValueLabelHtml,
} = window.NumberLineMath;

const state = {
  mode: "free",
  pointCount: 3,
  taskType: "integer",
  placementTask: null,
  readingTask: null,
  placementBoard: null,
  readingBoard: null,
  placementPoints: [],
  placementSolved: false,
  readingSolved: false,
  attemptIndex: 0,
  completedRounds: 0,
  currentStudent: "",
  assignmentId: "",
  assignmentConfig: null,
  assignmentApi: null,
};

const elements = {
  pageHeader: document.querySelector("#page-header"),
  exerciseGrid: document.querySelector("#exercise-grid"),
  toolbar: document.querySelector("#toolbar"),
  pointCountSelect: document.querySelector("#point-count-select"),
  taskTypeSelect: document.querySelector("#task-type-select"),
  allNewTaskButton: document.querySelector("#all-new-task-button"),
  placementCheckButton: document.querySelector("#placement-check-button"),
  placementTaskText: document.querySelector("#placement-task-text"),
  placementTaskFormula: document.querySelector("#placement-task-formula"),
  placementFeedback: document.querySelector("#placement-feedback"),
  readingCheckButton: document.querySelector("#reading-check-button"),
  readingInputList: document.querySelector("#reading-input-list"),
  readingFeedback: document.querySelector("#reading-feedback"),
  assignmentPanel: document.querySelector("#assignment-panel"),
  assignmentTitle: document.querySelector("#assignment-title"),
  assignmentDescription: document.querySelector("#assignment-description"),
  assignmentProgressValue: document.querySelector("#assignment-progress-value"),
  assignmentFeedback: document.querySelector("#assignment-feedback"),
  studentSetup: document.querySelector("#student-setup"),
  studentSelect: document.querySelector("#student-select"),
  startAssignmentButton: document.querySelector("#start-assignment-button"),
};

function applyBrandName() {
  const brandName = window.APP_CONFIG?.brandName ?? "SchoolTools";

  document.querySelectorAll("[data-brand-name]").forEach((element) => {
    element.textContent = brandName;
  });

  document.title = `Oś liczbowa - ${brandName}`;
}

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function isAssignmentMode() {
  return state.mode === "assignment";
}

function createBoard(containerId, range) {
  return JXG.JSXGraph.initBoard(containerId, {
    boundingbox: [range.min - 1, 1.3, range.max + 1, -1.3],
    axis: false,
    showCopyright: false,
    showInfobox: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
    keepAspectRatio: false,
  });
}

function drawNumberLine(board, range) {
  const visibleLabels = getAxisLabelValues(range);
  const tickDisplayStep = getTickDisplayStep(range, visibleLabels);
  const tickBaseValue = visibleLabels[0];
  const axisLine = board.create("line", [[range.min, 0], [range.max, 0]], {
    straightFirst: false,
    straightLast: false,
    strokeColor: "#334155",
    strokeWidth: 3,
    fixed: true,
    highlight: false,
  });

  board.create("arrow", [[range.max - 0.35, 0], [range.max + 0.35, 0]], {
    strokeColor: "#334155",
    strokeWidth: 3,
    fixed: true,
    highlight: false,
  });

  for (let value = range.min; value <= range.max + 0.000001; value += range.step) {
    const roundedValue = Math.round(value * 100) / 100;

    if (shouldRenderTick(roundedValue, tickBaseValue, tickDisplayStep)) {
      board.create("segment", [[roundedValue, -0.15], [roundedValue, 0.15]], {
        strokeColor: "#64748b",
        strokeWidth: 2,
        fixed: true,
        highlight: false,
      });
    }

    if (includesValue(visibleLabels, roundedValue)) {
      board.create(
        "text",
        [roundedValue, -0.42, getValueLabelHtml(state.taskType, roundedValue)],
        {
          fixed: true,
          highlight: false,
          anchorX: "middle",
          anchorY: "top",
          cssClass: "axis-label",
        },
      );
    }
  }

  return axisLine;
}

function includesValue(values, target) {
  return values.some((value) => Math.abs(value - target) < 0.000001);
}

function shouldRenderTick(value, baseValue, tickDisplayStep) {
  const scaledDifference =
    Math.round(((value - baseValue) / tickDisplayStep) * 1000) / 1000;
  return Math.abs(scaledDifference - Math.round(scaledDifference)) < 0.000001;
}

function resetBoard(board, containerId, range) {
  if (board) {
    JXG.JSXGraph.freeBoard(board);
  }

  return createBoard(containerId, range);
}

function getSnapValue(value, step) {
  return Math.round(value / step) * step;
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createTaskSettings() {
  return {
    pointCount: state.pointCount,
    taskType: state.taskType,
  };
}

function renderFeedback(element, message, status) {
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

function renderPlacementTask() {
  state.placementTask = generatePlacementTask(createTaskSettings());
  const { range, points } = state.placementTask;

  state.placementBoard = resetBoard(state.placementBoard, "placement-board", range);
  const axisLine = drawNumberLine(state.placementBoard, range);

  state.placementPoints = points.map((taskPoint, index) => {
    const startX = clampValue(
      range.min + range.step * (index + 1) * 2,
      range.min,
      range.max,
    );

    const point = state.placementBoard.create("glider", [startX, 0, axisLine], {
      name: taskPoint.label,
      size: 5,
      face: "o",
      strokeColor: "#2563eb",
      fillColor: "#60a5fa",
      snapToGrid: true,
      snapSizeX: range.step,
      snapSizeY: 1,
      attractToGrid: true,
      label: {
        offset: [0, 16],
      },
    });

    const lockPointToAxis = () => {
      const nextX = clampValue(
        getSnapValue(point.X(), range.step),
        range.min,
        range.max,
      );
      point.moveTo([nextX, 0]);
    };

    point.on("drag", lockPointToAxis);
    point.on("up", lockPointToAxis);

    return point;
  });

  elements.placementTaskText.textContent =
    "Zaznacz na osi punkty zgodnie z podanymi wartościami.";

  if (window.katex) {
    window.katex.render(
      formatLabeledValuesAsLatex(points),
      elements.placementTaskFormula,
      { throwOnError: false },
    );
  } else {
    elements.placementTaskFormula.textContent = points
      .map((point) => `${point.label} = ${point.plainText}`)
      .join(", ");
  }

  renderFeedback(
    elements.placementFeedback,
    "Przeciągnij punkty na właściwe miejsca na osi, a potem kliknij „Sprawdź”.",
    "default",
  );
}

function createFractionInputGroup(label) {
  const group = document.createElement("div");
  group.className = "fraction-answer";

  const wholeInput = document.createElement("input");
  wholeInput.id = `reading-input-${label}`;
  wholeInput.className = "answer-input answer-input--whole";
  wholeInput.type = "text";
  wholeInput.inputMode = "numeric";
  wholeInput.autocomplete = "off";
  wholeInput.spellcheck = false;
  wholeInput.dataset.label = label;
  wholeInput.dataset.part = "whole";
  wholeInput.setAttribute("aria-label", `Liczba całkowita dla punktu ${label}`);

  const fractionStack = document.createElement("div");
  fractionStack.className = "fraction-answer__stack";

  const numeratorInput = document.createElement("input");
  numeratorInput.className = "answer-input answer-input--fraction";
  numeratorInput.type = "text";
  numeratorInput.inputMode = "numeric";
  numeratorInput.autocomplete = "off";
  numeratorInput.spellcheck = false;
  numeratorInput.dataset.label = label;
  numeratorInput.dataset.part = "numerator";
  numeratorInput.setAttribute("aria-label", `Licznik dla punktu ${label}`);

  const denominatorInput = document.createElement("input");
  denominatorInput.className = "answer-input answer-input--fraction";
  denominatorInput.type = "text";
  denominatorInput.inputMode = "numeric";
  denominatorInput.autocomplete = "off";
  denominatorInput.spellcheck = false;
  denominatorInput.dataset.label = label;
  denominatorInput.dataset.part = "denominator";
  denominatorInput.setAttribute("aria-label", `Mianownik dla punktu ${label}`);

  fractionStack.append(numeratorInput, denominatorInput);
  group.append(wholeInput, fractionStack);

  return group;
}

function renderReadingInputs() {
  elements.readingInputList.innerHTML = "";

  state.readingTask.points.forEach((point) => {
    const wrapper = document.createElement("div");
    wrapper.className = "point-input";
    wrapper.dataset.label = point.label;

    const caption = document.createElement("label");
    caption.className = "point-input__label";
    caption.setAttribute("for", `reading-input-${point.label}`);
    caption.textContent = `${point.label} =`;

    wrapper.append(caption);

    if (state.taskType === "commonFraction") {
      wrapper.classList.add("point-input--fraction");
      wrapper.append(createFractionInputGroup(point.label));
    } else {
      const input = document.createElement("input");
      input.id = `reading-input-${point.label}`;
      input.className = "answer-input";
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.label = point.label;
      wrapper.append(input);
    }

    elements.readingInputList.append(wrapper);
  });
}

function renderReadingTask() {
  state.readingTask = generateReadingTask(createTaskSettings());
  const { range, points } = state.readingTask;

  state.readingBoard = resetBoard(state.readingBoard, "reading-board", range);
  drawNumberLine(state.readingBoard, range);

  points.forEach((point) => {
    state.readingBoard.create("point", [point.value, 0], {
      name: point.label,
      size: 5,
      fixed: true,
      strokeColor: "#d97706",
      fillColor: "#fbbf24",
      label: {
        offset: [0, 16],
      },
    });
  });

  renderReadingInputs();
  renderFeedback(
    elements.readingFeedback,
    "Odczytaj położenie punktów i wpisz ich wartości.",
    "default",
  );
}

function collectReadingAnswers() {
  const answers = {};
  const wrappers = elements.readingInputList.querySelectorAll(".point-input");

  wrappers.forEach((wrapper) => {
    const label = wrapper.dataset.label;

    if (state.taskType === "commonFraction") {
      const inputs = wrapper.querySelectorAll("input");
      answers[label] = {
        whole: "",
        numerator: "",
        denominator: "",
      };

      inputs.forEach((input) => {
        answers[label][input.dataset.part] = input.value;
      });

      return;
    }

    const input = wrapper.querySelector("input");
    answers[label] = input ? input.value : "";
  });

  return answers;
}

function updateAssignmentProgress() {
  if (!isAssignmentMode() || !state.assignmentConfig) {
    return;
  }

  const requiredSuccesses = state.assignmentConfig.settings.requiredSuccesses;
  elements.assignmentProgressValue.textContent =
    `${state.completedRounds} / ${requiredSuccesses}`;
}

async function submitAssignmentRoundProgress() {
  if (!isAssignmentMode() || !state.assignmentApi || !state.currentStudent) {
    return;
  }

  const requiredSuccesses = state.assignmentConfig.settings.requiredSuccesses;
  const completed = state.completedRounds >= requiredSuccesses;

  if (!completed) {
    return;
  }

  await state.assignmentApi.submitAssignmentAttempt({
    assignmentId: state.assignmentId,
    studentName: state.currentStudent,
    attemptIndex: state.attemptIndex,
    placementCorrect: state.placementSolved,
    readingCorrect: state.readingSolved,
    completedRounds: state.completedRounds,
    completed,
  });
}

async function handleAssignmentRoundCompleted() {
  state.completedRounds += 1;
  updateAssignmentProgress();

  try {
    await submitAssignmentRoundProgress();
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się zapisać postępu. ${error.message}`,
      "warning",
    );
  }

  const requiredSuccesses = state.assignmentConfig.settings.requiredSuccesses;

  if (state.completedRounds >= requiredSuccesses) {
    renderAssignmentFeedback(
      `Brawo, ${state.currentStudent}! Zadanie zostało ukończone.`,
      "success",
    );
    renderFeedback(
      elements.placementFeedback,
      "Ta runda jest już zaliczona.",
      "success",
    );
    renderFeedback(
      elements.readingFeedback,
      "Ta runda jest już zaliczona.",
      "success",
    );
    elements.placementCheckButton.disabled = true;
    elements.readingCheckButton.disabled = true;
    elements.exerciseGrid.hidden = true;
    return;
  }

  renderAssignmentFeedback(
    `Runda zaliczona. Zostało jeszcze ${requiredSuccesses - state.completedRounds} rund.`,
    "success",
  );
  startNextRound();
}

function startNextRound() {
  state.attemptIndex += 1;
  state.placementSolved = false;
  state.readingSolved = false;
  elements.placementCheckButton.disabled = false;
  elements.readingCheckButton.disabled = false;
  renderPlacementTask();
  renderReadingTask();
}

function handlePlacementCheck() {
  const positions = state.placementPoints.map((point) => {
    return Number(getSnapValue(point.X(), state.placementTask.range.step).toFixed(2));
  });
  const result = checkPlacementAnswer(state.placementTask, positions);

  if (result.isCorrect) {
    state.placementSolved = true;
    renderFeedback(
      elements.placementFeedback,
      "Dobrze! Świetna robota. Wszystkie punkty są zaznaczone poprawnie.",
      "success",
    );

    if (isAssignmentMode() && state.readingSolved) {
      handleAssignmentRoundCompleted();
    }

    return;
  }

  const hints = result.results
    .filter((item) => !item.isCorrect)
    .map((item) => `${item.label} powinien być na ${getValueLabel(state.taskType, item.expected)}`)
    .join(", ");

  renderFeedback(
    elements.placementFeedback,
    `Masz ${result.correctCount} z ${result.totalCount} poprawnych odpowiedzi. Sprawdź jeszcze raz: ${hints}.`,
    "warning",
  );
}

function handleReadingCheck() {
  const answers = collectReadingAnswers();
  const result = checkReadingAnswer(state.readingTask, answers);

  if (result.isCorrect) {
    state.readingSolved = true;
    renderFeedback(
      elements.readingFeedback,
      "Dobrze! Wszystkie współrzędne zostały odczytane poprawnie.",
      "success",
    );

    if (isAssignmentMode() && state.placementSolved) {
      handleAssignmentRoundCompleted();
    }

    return;
  }

  const incorrectPoints = result.results
    .filter((item) => !item.isCorrect)
    .map((item) => item.label)
    .join(", ");

  renderFeedback(
    elements.readingFeedback,
    `Jeszcze nie. Spróbuj ponownie. Sprawdź jeszcze punkty: ${incorrectPoints}.`,
    "warning",
  );
}

function syncPointCountSelector() {
  const allowedCount = getAllowedPointCount(state.taskType, state.pointCount);
  state.pointCount = allowedCount;
  elements.pointCountSelect.value = String(allowedCount);
}

function renderAllTasks() {
  syncPointCountSelector();
  state.placementSolved = false;
  state.readingSolved = false;
  renderPlacementTask();
  renderReadingTask();
}

function applyAssignmentConfig(config) {
  state.assignmentConfig = config;
  state.taskType = config.settings.taskType;
  state.pointCount = config.settings.pointCount;
  elements.taskTypeSelect.value = state.taskType;
  elements.pointCountSelect.value = String(state.pointCount);
  elements.assignmentTitle.textContent = config.title || "Zadanie nauczyciela";
  elements.assignmentDescription.textContent =
    config.settings.studentInstructions ||
    "Aby zaliczyć zadanie, wykonaj poprawnie wszystkie wskazane rundy.";
  updateAssignmentProgress();
}

function setExerciseControlsEnabled(isEnabled) {
  elements.placementCheckButton.disabled = !isEnabled;
  elements.readingCheckButton.disabled = !isEnabled;
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
    setExerciseControlsEnabled(true);
    elements.exerciseGrid.hidden = false;
    renderAssignmentFeedback(
      `Powodzenia, ${state.currentStudent}. Możesz zaczynać pierwszą rundę.`,
      "default",
    );
    startNextRound();
  } catch (error) {
    renderAssignmentFeedback(
      `Nie udało się rozpocząć zadania. ${error.message}`,
      "warning",
    );
  }
}

async function initializeAssignmentMode() {
  const params = getUrlParams();
  const assignmentId = params.get("assignment");
  const apiUrl = params.get("api") || window.APP_CONFIG?.assignmentsApiUrl || "";

  if (!assignmentId || !apiUrl) {
    return false;
  }

  state.mode = "assignment";
  state.assignmentId = assignmentId;
  elements.assignmentPanel.hidden = false;
  elements.toolbar.hidden = true;
  elements.pageHeader.hidden = true;
  elements.exerciseGrid.hidden = true;
  setExerciseControlsEnabled(false);
  renderAssignmentFeedback("Trwa wczytywanie zadania...");

  try {
    state.assignmentApi = window.createAssignmentApiClient({ apiUrl });
    const response = await state.assignmentApi.getAssignment(assignmentId);
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
  elements.pointCountSelect.addEventListener("change", (event) => {
    state.pointCount = Number(event.target.value);
    renderAllTasks();
  });

  elements.taskTypeSelect.addEventListener("change", (event) => {
    state.taskType = event.target.value;
    renderAllTasks();
  });

  elements.allNewTaskButton.addEventListener("click", renderAllTasks);
  elements.placementCheckButton.addEventListener("click", handlePlacementCheck);
  elements.readingCheckButton.addEventListener("click", handleReadingCheck);
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
    setExerciseControlsEnabled(true);
    elements.exerciseGrid.hidden = false;
    renderAllTasks();
  }
}

initializeApp();
