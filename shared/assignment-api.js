function createAssignmentApiClient(options) {
  const apiUrl = options?.apiUrl ?? window.APP_CONFIG?.assignmentsApiUrl ?? "";

  if (!apiUrl) {
    throw new Error("Brak adresu API dla zadań.");
  }

  async function request(action, payload, method = "POST") {
    let response;

    if (method === "GET") {
      const url = new URL(apiUrl);
      url.searchParams.set("action", action);

      Object.entries(payload ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      });

      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
    } else {
      response = await fetch(apiUrl, {
        method,
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action,
          ...(payload ?? {}),
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`Żądanie API nie powiodło się (${response.status}).`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "API zwróciło błąd.");
    }

    return data;
  }

  return {
    apiUrl,
    getClasses() {
      return request("getClasses", {}, "GET");
    },
    getLinearEquationTask(difficulty, group = "") {
      return request(
        "getLinearEquationTask",
        { difficulty, group },
        "GET",
      );
    },
    getAssignment(assignmentId) {
      return request("getAssignment", { assignmentId }, "GET");
    },
    createAssignment(payload) {
      return request("createAssignment", payload, "POST");
    },
    startAssignment(payload) {
      return request("startAssignment", payload, "POST");
    },
    submitAssignmentAttempt(payload) {
      return request("submitAssignmentAttempt", payload, "POST");
    },
  };
}

window.createAssignmentApiClient = createAssignmentApiClient;
