const SHEET_NAMES = {
  assignments: "assignments",
  classes: "classes",
  students: "students",
  attempts: "attempts",
  linearEquationTasks: "linear-equations-tasks",
  spaceQuizQuestions: "space-quiz-questions",
};

function doGet(event) {
  try {
    return createJsonResponse(handleGetRequest(event.parameter));
  } catch (error) {
    return createJsonResponse({
      ok: false,
      error: error.message,
    });
  }
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    return createJsonResponse(handlePostRequest(payload));
  } catch (error) {
    return createJsonResponse({
      ok: false,
      error: error.message,
    });
  }
}

function handleGetRequest(parameters) {
  const action = parameters.action;

  if (action === "getAssignment") {
    return getAssignmentResponse(parameters.assignmentId);
  }

  if (action === "getClasses") {
    return getClassesResponse();
  }

  if (action === "getLinearEquationTask") {
    return getLinearEquationTaskResponse(parameters.difficulty, parameters.group);
  }

  if (action === "getSpaceQuizFilters") {
    return getSpaceQuizFiltersResponse(parameters.grade);
  }

  if (action === "getSpaceQuizQuestions") {
    return getSpaceQuizQuestionsResponse(
      parameters.grade,
      parameters.topic,
      parameters.count,
    );
  }

  throw new Error("Nieobsługiwana akcja GET.");
}

function handlePostRequest(payload) {
  const action = payload.action;

  if (action === "createAssignment") {
    return createAssignment(payload);
  }

  if (action === "startAssignment") {
    return startAssignment(payload);
  }

  if (action === "submitAssignmentAttempt") {
    return submitAssignmentAttempt(payload);
  }

  throw new Error("Nieobsługiwana akcja POST.");
}

function createAssignment(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.assignments,
    [
      "assignmentId",
      "title",
      "tool",
      "classId",
      "settingsJson",
      "assignmentLink",
      "createdAt",
    ],
  );
  const studentsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.students,
    ["assignmentId", "studentName"],
  );
  const classRoster = getStudentsForClass_(spreadsheet, payload.classId);

  const assignmentId = Utilities.getUuid();
  const settings = payload.settings || {};

  if (!payload.classId) {
    throw new Error("Brak klasy dla zadania.");
  }

  if (!classRoster.length) {
    throw new Error("Wybrana klasa nie ma uczniów w arkuszu classes.");
  }

  const settingsJson = JSON.stringify(settings);
  const assignmentLink = buildAssignmentLink_(
    payload.studentBaseUrl,
    assignmentId,
    payload.apiUrl,
  );

  assignmentsSheet.appendRow([
    assignmentId,
    payload.title || "Oś liczbowa",
    payload.tool || "number-line",
    payload.classId,
    settingsJson,
    assignmentLink,
    new Date().toISOString(),
  ]);

  classRoster.forEach(function appendStudent(name) {
    studentsSheet.appendRow([assignmentId, name]);
  });

  return {
    ok: true,
    assignment: {
      id: assignmentId,
      link: assignmentLink,
    },
  };
}

function getAssignmentResponse(assignmentId) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.assignments,
    [
      "assignmentId",
      "title",
      "tool",
      "classId",
      "settingsJson",
      "assignmentLink",
      "createdAt",
    ],
  );
  const studentsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.students,
    ["assignmentId", "studentName"],
  );

  const assignmentRow = findRowByValue_(assignmentsSheet, 1, assignmentId);

  if (!assignmentRow) {
    throw new Error("Nie znaleziono zadania.");
  }

  const students = studentsSheet
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(function filterStudent(row) {
      return row[0] === assignmentId;
    })
    .map(function mapStudent(row) {
      return row[1];
    });

  const assignmentData = normalizeAssignmentRow_(assignmentRow);

  return {
    ok: true,
    assignment: {
      id: assignmentData.id,
      title: assignmentData.title,
      tool: assignmentData.tool,
      settings: assignmentData.settings,
      link: assignmentData.link,
    },
    students: students,
  };
}

function getClassesResponse() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const classesSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.classes,
    ["classId", "studentName"],
  );
  const classMap = new Map();
  const rows = classesSheet.getDataRange().getValues().slice(1);

  rows.forEach(function forEachRow(row) {
    const classId = String(row[0] || "").trim();
    const studentName = String(row[1] || "").trim();

    if (!classId || !studentName) {
      return;
    }

    if (!classMap.has(classId)) {
      classMap.set(classId, []);
    }

    classMap.get(classId).push(studentName);
  });

  const classes = Array.from(classMap.entries())
    .map(function mapClass(entry) {
      return {
        id: entry[0],
        name: entry[0],
        studentCount: entry[1].length,
      };
    })
    .sort(function sortClasses(left, right) {
      return left.name.localeCompare(right.name);
    });

  return {
    ok: true,
    classes: classes,
  };
}

function getLinearEquationTaskResponse(difficulty, group) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const tasksSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.linearEquationTasks,
    [
      "taskId",
      "difficulty",
      "group",
      "title",
      "sourceEquationLatex",
      "simplifiedLeft",
      "simplifiedRight",
      "tilePool",
      "instructions",
    ],
  );

  const rows = tasksSheet.getDataRange().getValues().slice(1);
  const normalizedDifficulty = String(difficulty || "").trim().toLowerCase();
  const normalizedGroup = String(group || "").trim().toLowerCase();

  const filteredRows = rows.filter(function filterRow(row) {
    const rowDifficulty = String(row[1] || "").trim().toLowerCase();
    const rowGroup = String(row[2] || "").trim().toLowerCase();

    if (!rowDifficulty || !row[4] || !row[5] || !row[6]) {
      return false;
    }

    if (normalizedDifficulty && rowDifficulty !== normalizedDifficulty) {
      return false;
    }

    if (normalizedGroup && rowGroup !== normalizedGroup) {
      return false;
    }

    return true;
  });

  if (!filteredRows.length) {
    throw new Error(
      "Nie znaleziono zadań w zakładce linear-equations-tasks dla wybranego poziomu.",
    );
  }

  const randomRow =
    filteredRows[Math.floor(Math.random() * filteredRows.length)];

  return {
    ok: true,
    task: normalizeLinearEquationTaskRow_(randomRow),
  };
}

function getSpaceQuizFiltersResponse(grade) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const questionsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.spaceQuizQuestions,
    [
      "questionId",
      "grade",
      "topic",
      "question",
      "answerA",
      "answerB",
      "answerC",
      "correctAnswer",
      "explanation",
    ],
  );
  const rows = questionsSheet.getDataRange().getValues().slice(1);
  const normalizedGrade = String(grade || "").trim().toLowerCase();
  const gradeSet = new Set();
  const topicSet = new Set();

  rows.forEach(function collectFilter(row) {
    const rowGrade = String(row[1] || "").trim();
    const topic = String(row[2] || "").trim();

    if (rowGrade) {
      gradeSet.add(rowGrade);
    }

    if (
      topic &&
      (!normalizedGrade || rowGrade.toLowerCase() === normalizedGrade)
    ) {
      topicSet.add(topic);
    }
  });

  return {
    ok: true,
    grades: Array.from(gradeSet).sort(),
    topics: Array.from(topicSet).sort(function sortTopics(left, right) {
      return left.localeCompare(right);
    }),
  };
}

function getSpaceQuizQuestionsResponse(grade, topic, count) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const questionsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.spaceQuizQuestions,
    [
      "questionId",
      "grade",
      "topic",
      "question",
      "answerA",
      "answerB",
      "answerC",
      "correctAnswer",
      "explanation",
    ],
  );
  const normalizedGrade = String(grade || "").trim().toLowerCase();
  const normalizedTopic = String(topic || "").trim().toLowerCase();
  const questionLimit = Math.max(1, Math.min(30, Number(count || 8)));
  const rows = questionsSheet.getDataRange().getValues().slice(1);
  const filteredRows = rows.filter(function filterQuestion(row) {
    const rowGrade = String(row[1] || "").trim().toLowerCase();
    const rowTopic = String(row[2] || "").trim().toLowerCase();
    const questionText = String(row[3] || "").trim();
    const correctAnswer = String(row[7] || "").trim().toUpperCase();

    if (!questionText || !row[4] || !row[5] || !row[6]) {
      return false;
    }

    if (!["A", "B", "C"].includes(correctAnswer)) {
      return false;
    }

    if (normalizedGrade && rowGrade !== normalizedGrade) {
      return false;
    }

    if (normalizedTopic && rowTopic !== normalizedTopic) {
      return false;
    }

    return true;
  });

  if (!filteredRows.length) {
    throw new Error(
      "Nie znaleziono pytań w zakładce space-quiz-questions dla wybranej klasy i działu.",
    );
  }

  return {
    ok: true,
    questions: shuffleRows_(filteredRows)
      .slice(0, questionLimit)
      .map(normalizeSpaceQuizQuestionRow_),
  };
}

function startAssignment(payload) {
  return {
    ok: true,
  };
}

function submitAssignmentAttempt(payload) {
  if (!payload.completed) {
    return {
      ok: true,
    };
  }

  return appendAttemptRow_(payload, {
    status: "completed",
    completedRounds: Number(payload.completedRounds || 0),
    completed: Boolean(payload.completed),
  });
}

function appendAttemptRow_(payload, details) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const assignmentInfo = getAssignmentById_(spreadsheet, payload.assignmentId);
  const attemptsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.attempts,
    [
      "timestamp",
      "assignmentId",
      "tool",
      "classId",
      "studentName",
      "status",
      "attemptIndex",
      "placementCorrect",
      "readingCorrect",
      "completedRounds",
      "completed",
      "score",
      "accuracyPercent",
      "detailsJson",
    ],
  );

  attemptsSheet.appendRow([
    new Date().toISOString(),
    payload.assignmentId || "",
    assignmentInfo ? assignmentInfo.tool : "",
    assignmentInfo ? assignmentInfo.classId : "",
    payload.studentName || "",
    details.status,
    Number(payload.attemptIndex || 0),
    payload.placementCorrect ? "TRUE" : "FALSE",
    payload.readingCorrect ? "TRUE" : "FALSE",
    Number(details.completedRounds || 0),
    details.completed ? "TRUE" : "FALSE",
    Number(payload.score || 0),
    Number(payload.accuracyPercent || 0),
    JSON.stringify(payload.details || {}),
  ]);

  return {
    ok: true,
  };
}

function getOrCreateSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function getStudentsForClass_(spreadsheet, classId) {
  const classesSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.classes,
    ["classId", "studentName"],
  );

  return classesSheet
    .getDataRange()
    .getValues()
    .slice(1)
    .filter(function filterClass(row) {
      return String(row[0] || "").trim() === String(classId || "").trim();
    })
    .map(function mapStudent(row) {
      return String(row[1] || "").trim();
    })
    .filter(Boolean);
}

function normalizeAssignmentRow_(row) {
  const maybeSettingsJson = row[4];

  if (
    typeof maybeSettingsJson === "string" &&
    maybeSettingsJson.trim().startsWith("{")
  ) {
    return {
      id: row[0],
      title: row[1],
      tool: row[2],
      settings: JSON.parse(maybeSettingsJson),
      link: row[5] || "",
      classId: row[3] || "",
    };
  }

  return {
    id: row[0],
    title: row[1],
    tool: row[2],
    settings: {
      taskType: row[3],
      pointCount: Number(row[4]),
      requiredSuccesses: Number(row[5]),
      studentInstructions: row[6] || "",
      classId: row[7] || "",
    },
    link: row[8] || "",
  };
}

function getAssignmentById_(spreadsheet, assignmentId) {
  if (!assignmentId) {
    return null;
  }

  const assignmentsSheet = getOrCreateSheet_(
    spreadsheet,
    SHEET_NAMES.assignments,
    [
      "assignmentId",
      "title",
      "tool",
      "classId",
      "settingsJson",
      "assignmentLink",
      "createdAt",
    ],
  );
  const row = findRowByValue_(assignmentsSheet, 1, assignmentId);

  if (!row) {
    return null;
  }

  const normalized = normalizeAssignmentRow_(row);

  return {
    tool: normalized.tool || "",
    classId: normalized.settings.classId || normalized.classId || "",
  };
}

function buildAssignmentLink_(studentBaseUrl, assignmentId, apiUrl) {
  if (!studentBaseUrl) {
    return "";
  }

  return (
    studentBaseUrl +
    "?a=" +
    encodeURIComponent(assignmentId)
  );
}

function findRowByValue_(sheet, columnIndex, value) {
  const rows = sheet.getDataRange().getValues().slice(1);
  return rows.find(function findRow(row) {
    return row[columnIndex - 1] === value;
  });
}

function normalizeLinearEquationTaskRow_(row) {
  return {
    taskId: String(row[0] || "").trim(),
    difficulty: String(row[1] || "").trim().toLowerCase(),
    group: String(row[2] || "").trim(),
    title: String(row[3] || "").trim(),
    sourceEquationLatex: String(row[4] || "").trim(),
    simplifiedLeft: String(row[5] || "").trim(),
    simplifiedRight: String(row[6] || "").trim(),
    tilePool: String(row[7] || "").trim(),
    instructions: String(row[8] || "").trim(),
  };
}

function normalizeSpaceQuizQuestionRow_(row) {
  return {
    id: String(row[0] || "").trim(),
    grade: String(row[1] || "").trim(),
    topic: String(row[2] || "").trim(),
    prompt: String(row[3] || "").trim(),
    answers: [
      {
        key: "A",
        label: String(row[4] || "").trim(),
      },
      {
        key: "B",
        label: String(row[5] || "").trim(),
      },
      {
        key: "C",
        label: String(row[6] || "").trim(),
      },
    ],
    correctKey: String(row[7] || "").trim().toUpperCase(),
    explanation: String(row[8] || "").trim(),
  };
}

function shuffleRows_(rows) {
  const result = rows.slice();

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }

  return result;
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
