(function attachSpaceQuizMath(globalObject) {
  const SETTING_OPTIONS = {
    grades: ["4", "5", "6", "7", "8"],
    questionCounts: [5, 8, 10, 12, 15],
    secondsPerQuestion: [5, 7, 9, 12],
  };

  const FALLBACK_QUESTIONS = [
    {
      id: "sample-1",
      grade: "4",
      topic: "Trening",
      prompt: "Ile to jest 7 · 8?",
      answers: [
        { key: "A", label: "54" },
        { key: "B", label: "56" },
        { key: "C", label: "64" },
      ],
      correctKey: "B",
      explanation: "7 · 8 = 56.",
    },
    {
      id: "sample-2",
      grade: "4",
      topic: "Trening",
      prompt: "Która liczba jest parzysta?",
      answers: [
        { key: "A", label: "35" },
        { key: "B", label: "47" },
        { key: "C", label: "62" },
      ],
      correctKey: "C",
      explanation: "Liczba 62 dzieli się przez 2.",
    },
    {
      id: "sample-3",
      grade: "5",
      topic: "Trening",
      prompt: "Jaki jest wynik działania 3/4 + 1/4?",
      answers: [
        { key: "A", label: "1" },
        { key: "B", label: "4/8" },
        { key: "C", label: "3/8" },
      ],
      correctKey: "A",
      explanation: "Cztery czwarte to jedna całość.",
    },
  ];

  function normalizeSettings(settings) {
    return {
      grade: clampToTextOption(settings?.grade, SETTING_OPTIONS.grades, "4"),
      topic: String(settings?.topic || "Trening").trim() || "Trening",
      questionCount: clampToOptions(
        settings?.questionCount,
        SETTING_OPTIONS.questionCounts,
        8,
      ),
      secondsPerQuestion: clampToOptions(
        settings?.secondsPerQuestion,
        SETTING_OPTIONS.secondsPerQuestion,
        7,
      ),
      studentInstructions: String(settings?.studentInstructions || "").trim(),
    };
  }

  function clampToOptions(rawValue, options, fallbackValue) {
    const numericValue = Number(rawValue);

    if (options.includes(numericValue)) {
      return numericValue;
    }

    return fallbackValue;
  }

  function clampToTextOption(rawValue, options, fallbackValue) {
    const textValue = String(rawValue || "").trim();

    if (options.includes(textValue)) {
      return textValue;
    }

    return fallbackValue;
  }

  function normalizeQuestion(rawQuestion, index) {
    const answers = normalizeAnswers(rawQuestion);
    const correctKey = String(rawQuestion?.correctKey || rawQuestion?.correctAnswer || "")
      .trim()
      .toUpperCase();

    return {
      id: String(rawQuestion?.id || rawQuestion?.questionId || `question-${index + 1}`),
      grade: String(rawQuestion?.grade || "").trim(),
      topic: String(rawQuestion?.topic || "").trim(),
      prompt: String(rawQuestion?.prompt || rawQuestion?.question || "").trim(),
      answers,
      correctKey: ["A", "B", "C"].includes(correctKey) ? correctKey : "A",
      explanation: String(rawQuestion?.explanation || "").trim(),
    };
  }

  function normalizeAnswers(rawQuestion) {
    if (Array.isArray(rawQuestion?.answers) && rawQuestion.answers.length >= 3) {
      return rawQuestion.answers.slice(0, 3).map((answer, index) => ({
        key: ["A", "B", "C"][index],
        label: String(answer?.label || answer || "").trim(),
      }));
    }

    return [
      { key: "A", label: String(rawQuestion?.answerA || "").trim() },
      { key: "B", label: String(rawQuestion?.answerB || "").trim() },
      { key: "C", label: String(rawQuestion?.answerC || "").trim() },
    ];
  }

  function createMission(settings, questionPool) {
    const safeSettings = normalizeSettings(settings);
    const normalizedPool = (questionPool && questionPool.length
      ? questionPool
      : FALLBACK_QUESTIONS
    )
      .map(normalizeQuestion)
      .filter(isPlayableQuestion);
    const questions = pickMissionQuestions(
      normalizedPool.length ? normalizedPool : FALLBACK_QUESTIONS,
      safeSettings.questionCount,
    );

    return {
      settings: safeSettings,
      questions,
    };
  }

  function isPlayableQuestion(question) {
    return (
      Boolean(question.prompt) &&
      question.answers.length === 3 &&
      question.answers.every((answer) => Boolean(answer.label)) &&
      ["A", "B", "C"].includes(question.correctKey)
    );
  }

  function pickMissionQuestions(pool, questionCount) {
    return shuffleList(pool)
      .slice(0, questionCount)
      .map((question) => ({
        ...question,
        meteorVariant: 1 + Math.floor(Math.random() * 4),
      }));
  }

  function checkAnswer(question, selectedKey) {
    const normalizedKey = String(selectedKey || "").trim().toUpperCase();
    const isValid = ["A", "B", "C"].includes(normalizedKey);
    const isCorrect = isValid && normalizedKey === question.correctKey;

    return {
      isValid,
      isCorrect,
      selectedKey: normalizedKey,
      expectedKey: question.correctKey,
      message: isCorrect
        ? "Dobrze! Świetna robota."
        : "Jeszcze nie. Spróbuj ponownie.",
    };
  }

  function pickDefenseAction() {
    const actions = ["dodge-up", "dodge-down", "shoot"];
    return actions[Math.floor(Math.random() * actions.length)];
  }

  function getPointsForCorrectAnswer(context) {
    const secondsLeft = Math.max(0, Number(context?.secondsLeft) || 0);
    const streak = Math.max(1, Number(context?.streak) || 1);

    return 100 + Math.round(secondsLeft * 12) + Math.min(streak - 1, 5) * 20;
  }

  function createMissionSummary(stats) {
    const totalQuestions = Math.max(0, Number(stats?.totalQuestions) || 0);
    const completedQuestions = Math.max(0, Number(stats?.completedQuestions) || 0);
    const totalAttempts = Math.max(0, Number(stats?.totalAttempts) || 0);
    const score = Math.max(0, Number(stats?.score) || 0);
    const failed = Boolean(stats?.failed);
    const accuracyPercent =
      totalAttempts > 0
        ? Math.round((completedQuestions / totalAttempts) * 100)
        : 0;

    return {
      failed,
      score,
      totalQuestions,
      completedQuestions,
      totalAttempts,
      accuracyPercent,
      headline: failed ? "Statek wraca na start" : "Lot ukończony",
      message: failed
        ? `Dotarłeś do pytania ${Math.min(completedQuestions + 1, totalQuestions)} z ${totalQuestions}. Spróbuj jeszcze raz od początku.`
        : `Wszystkie ${totalQuestions} pytań rozwiązane bez zderzenia. Bardzo dobry lot!`,
    };
  }

  function shuffleList(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  }

  globalObject.SpaceQuizMath = {
    FALLBACK_QUESTIONS,
    SETTING_OPTIONS,
    checkAnswer,
    createMission,
    createMissionSummary,
    getPointsForCorrectAnswer,
    normalizeQuestion,
    normalizeSettings,
    pickDefenseAction,
  };
})(window);
