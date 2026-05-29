const teacherElements = {
  form: document.querySelector("#assignment-form"),
  classSelect: document.querySelector("#class-select"),
  apiWarning: document.querySelector("#api-warning"),
  assignmentLinkOutput: document.querySelector("#assignment-link-output"),
  resultCard: document.querySelector("#result-card"),
  copyLinkButton: document.querySelector("#copy-link-button"),
  feedback: document.querySelector("#teacher-feedback"),
};

function applyTeacherBrandName() {
  const brandName = window.APP_CONFIG?.brandName ?? "SchoolTools";

  document.querySelectorAll("[data-brand-name]").forEach((element) => {
    element.textContent = brandName;
  });

  document.title = `Panel nauczyciela - ${brandName}`;
}

function renderTeacherFeedback(message, status = "default") {
  teacherElements.feedback.textContent = message;

  if (status === "default") {
    teacherElements.feedback.removeAttribute("data-status");
    return;
  }

  teacherElements.feedback.dataset.status = status;
}

function getDefaultApiUrl() {
  return window.APP_CONFIG?.assignmentsApiUrl ?? "";
}

function getStudentToolBaseUrl() {
  return new URL("../tools/number-line/index.html", window.location.href).toString();
}

function collectTeacherFormPayload(formData) {
  const apiUrl = getDefaultApiUrl();

  return {
    title: String(formData.get("title") ?? "").trim(),
    tool: "number-line",
    classId: String(formData.get("classId") ?? "").trim(),
    apiUrl,
    studentBaseUrl: getStudentToolBaseUrl(),
    settings: {
      taskType: String(formData.get("taskType") ?? "integer"),
      pointCount: Number(formData.get("pointCount") ?? 3),
      requiredSuccesses: Number(formData.get("requiredSuccesses") ?? 3),
      studentInstructions: String(
        formData.get("studentInstructions") ?? "",
      ).trim(),
    },
  };
}

function buildStudentAssignmentLink(assignmentId, apiUrl) {
  const url = new URL(getStudentToolBaseUrl());
  url.searchParams.set("assignment", assignmentId);
  url.searchParams.set("api", apiUrl);
  return url.toString();
}

async function handleTeacherSubmit(event) {
  event.preventDefault();

  const formData = new FormData(teacherElements.form);
  const apiUrl = getDefaultApiUrl();

  if (!apiUrl) {
    renderTeacherFeedback(
      "Najpierw ustaw adres Apps Script w shared/config.js.",
      "warning",
    );
    return;
  }

  const payload = collectTeacherFormPayload(formData);

  if (!payload.classId) {
    renderTeacherFeedback(
      "Wybierz klasę dla tego zadania.",
      "warning",
    );
    return;
  }

  try {
    renderTeacherFeedback("Tworzę zadanie i przygotowuję link dla uczniów...");
    const api = window.createAssignmentApiClient({ apiUrl });
    const response = await api.createAssignment(payload);
    const assignmentLink = buildStudentAssignmentLink(
      response.assignment.id,
      api.apiUrl,
    );

    teacherElements.assignmentLinkOutput.value =
      response.assignment.link || assignmentLink;
    teacherElements.resultCard.hidden = false;

    renderTeacherFeedback(
      "Gotowe. Link dla uczniów został wygenerowany.",
      "success",
    );
  } catch (error) {
    renderTeacherFeedback(
      `Nie udało się utworzyć zadania. ${error.message}`,
      "warning",
    );
  }
}

async function handleCopyLink() {
  try {
    await navigator.clipboard.writeText(teacherElements.assignmentLinkOutput.value);
    renderTeacherFeedback("Link został skopiowany do schowka.", "success");
  } catch (error) {
    renderTeacherFeedback(
      "Nie udało się skopiować linku. Skopiuj go ręcznie z pola tekstowego.",
      "warning",
    );
  }
}

function populateClassOptions(classes) {
  teacherElements.classSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Wybierz klasę";
  teacherElements.classSelect.append(placeholder);

  classes.forEach((classEntry) => {
    const option = document.createElement("option");
    option.value = classEntry.id;
    option.textContent = `${classEntry.name} (${classEntry.studentCount})`;
    teacherElements.classSelect.append(option);
  });
}

async function loadClasses() {
  const apiUrl = getDefaultApiUrl();

  if (!apiUrl) {
    teacherElements.apiWarning.hidden = false;
    teacherElements.apiWarning.textContent =
      "Ustaw adres Apps Script w shared/config.js, aby wczytać klasy z arkusza.";
    teacherElements.classSelect.innerHTML =
      '<option value="">Brak połączenia z arkuszem</option>';
    return;
  }

  try {
    const api = window.createAssignmentApiClient({ apiUrl });
    const response = await api.getClasses();
    populateClassOptions(response.classes || []);
    teacherElements.apiWarning.hidden = true;
  } catch (error) {
    teacherElements.apiWarning.hidden = false;
    teacherElements.apiWarning.textContent =
      `Nie udało się wczytać klas z arkusza. ${error.message}`;
    teacherElements.classSelect.innerHTML =
      '<option value="">Nie udało się wczytać klas</option>';
  }
}

function initializeTeacherPanel() {
  applyTeacherBrandName();
  teacherElements.form.addEventListener("submit", handleTeacherSubmit);
  teacherElements.copyLinkButton.addEventListener("click", handleCopyLink);
  loadClasses();
}

initializeTeacherPanel();
