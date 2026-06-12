(function attachMultiplicationGameMath(globalObject) {
  const SETTING_OPTIONS = {
    maxFactor: [9, 10, 15],
    questionCount: [8, 12, 16],
    timeLimitSeconds: [45, 60, 90],
  };

  function normalizeSettings(settings) {
    return {
      maxFactor: clampToOptions(settings?.maxFactor, SETTING_OPTIONS.maxFactor, 10),
      questionCount: clampToOptions(
        settings?.questionCount,
        SETTING_OPTIONS.questionCount,
        12,
      ),
      timeLimitSeconds: clampToOptions(
        settings?.timeLimitSeconds,
        SETTING_OPTIONS.timeLimitSeconds,
        60,
      ),
    };
  }

  function clampToOptions(rawValue, options, fallbackValue) {
    const numericValue = Number(rawValue);

    if (options.includes(numericValue)) {
      return numericValue;
    }

    return fallbackValue;
  }

  function createMission(settings) {
    const safeSettings = normalizeSettings(settings);
    const questionPool = createQuestionPool(safeSettings.maxFactor);
    const questions = pickMissionQuestions(questionPool, safeSettings.questionCount);

    return {
      settings: safeSettings,
      questions,
    };
  }

  function createQuestionPool(maxFactor) {
    const questions = [];

    for (let left = 2; left <= maxFactor; left += 1) {
      for (let right = left; right <= maxFactor; right += 1) {
        questions.push({
          left,
          right,
          product: left * right,
          signature: `${left}x${right}`,
        });
      }
    }

    return questions;
  }

  function pickMissionQuestions(pool, questionCount) {
    const selectedQuestions = [];
    let shuffledPool = shuffleList(pool);

    while (selectedQuestions.length < questionCount) {
      if (shuffledPool.length === 0) {
        shuffledPool = shuffleList(pool);
      }

      const candidate = shuffledPool.shift();

      if (
        selectedQuestions.length > 0 &&
        selectedQuestions[selectedQuestions.length - 1].signature === candidate.signature &&
        shuffledPool.length > 0
      ) {
        shuffledPool.push(candidate);
        continue;
      }

      selectedQuestions.push(createQuestionVariant(candidate));
    }

    return selectedQuestions;
  }

  function createQuestionVariant(question) {
    const shouldSwap = question.left !== question.right && Math.random() < 0.5;

    return {
      left: shouldSwap ? question.right : question.left,
      right: shouldSwap ? question.left : question.right,
      product: question.product,
      signature: question.signature,
    };
  }

  function checkAnswer(question, rawAnswer) {
    const normalizedValue = String(rawAnswer ?? "").trim().replace(/\s+/g, "");

    if (!normalizedValue) {
      return {
        isValid: false,
        isCorrect: false,
        expectedAnswer: question.product,
        parsedAnswer: null,
        message: "Wpisz wynik, zanim sprawdzisz odpowiedź.",
      };
    }

    if (!/^-?\d+$/.test(normalizedValue)) {
      return {
        isValid: false,
        isCorrect: false,
        expectedAnswer: question.product,
        parsedAnswer: null,
        message: "Wpisz liczbę całkowitą, na przykład 24.",
      };
    }

    const parsedAnswer = Number(normalizedValue);

    return {
      isValid: true,
      isCorrect: parsedAnswer === question.product,
      expectedAnswer: question.product,
      parsedAnswer,
      message:
        parsedAnswer === question.product
          ? "Dobrze! Świetna robota."
          : "Jeszcze nie. Spróbuj ponownie.",
    };
  }

  function getPointsForCorrectAnswer(context) {
    const secondsLeft = Math.max(0, Number(context?.secondsLeft) || 0);
    const streak = Math.max(1, Number(context?.streak) || 1);
    const basePoints = 60;
    const speedBonus = Math.min(secondsLeft, 30) * 2;
    const streakBonus = Math.min(streak - 1, 6) * 12;

    return basePoints + speedBonus + streakBonus;
  }

  function getPenaltySeconds() {
    return 4;
  }

  function createMissionSummary(stats) {
    const totalQuestions = Number(stats?.totalQuestions || 0);
    const solvedQuestions = Math.min(
      totalQuestions,
      Math.max(0, Number(stats?.solvedQuestions || 0)),
    );
    const totalAttempts = Math.max(0, Number(stats?.totalAttempts || 0));
    const firstTryCorrectCount = Math.max(
      0,
      Number(stats?.firstTryCorrectCount || 0),
    );
    const remainingSeconds = Math.max(0, Number(stats?.remainingSeconds || 0));
    const failed = Boolean(stats?.failed);
    const score = Math.max(0, Number(stats?.score || 0));
    const bestStreak = Math.max(0, Number(stats?.bestStreak || 0));
    const accuracyPercent =
      totalAttempts > 0
        ? Math.round((solvedQuestions / totalAttempts) * 100)
        : 0;
    const firstTryPercent =
      totalQuestions > 0
        ? Math.round((firstTryCorrectCount / totalQuestions) * 100)
        : 0;

    return {
      failed,
      score,
      totalQuestions,
      solvedQuestions,
      totalAttempts,
      firstTryCorrectCount,
      accuracyPercent,
      firstTryPercent,
      bestStreak,
      remainingSeconds,
      headline: getSummaryHeadline({
        failed,
        firstTryPercent,
        remainingSeconds,
      }),
      message: getSummaryMessage({
        failed,
        solvedQuestions,
        totalQuestions,
        firstTryPercent,
      }),
    };
  }

  function getSummaryHeadline(context) {
    if (context.failed) {
      return "Rakieta potrzebuje jeszcze jednej próby";
    }

    if (context.firstTryPercent >= 85 && context.remainingSeconds >= 10) {
      return "Mistrz rakietowego sprintu";
    }

    if (context.firstTryPercent >= 60) {
      return "Bardzo mocny lot";
    }

    return "Misja wykonana";
  }

  function getSummaryMessage(context) {
    if (context.failed) {
      return `Rozwiązano ${context.solvedQuestions} z ${context.totalQuestions} przykładów. Spróbuj jeszcze raz i utrzymaj tempo do końca.`;
    }

    if (context.firstTryPercent >= 85) {
      return "Prawie każda odpowiedź weszła od razu. To był naprawdę szybki i pewny przelot.";
    }

    if (context.firstTryPercent >= 60) {
      return "Misja zaliczona. Dobra seria i coraz pewniejsze odpowiedzi.";
    }

    return "Udało się ukończyć całą misję. Jeszcze jedna runda i będzie jeszcze lepiej.";
  }

  function getRangeLabel(maxFactor) {
    return `do ${maxFactor}`;
  }

  function shuffleList(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  }

  globalObject.MultiplicationGameMath = {
    SETTING_OPTIONS,
    checkAnswer,
    createMission,
    createMissionSummary,
    getPenaltySeconds,
    getPointsForCorrectAnswer,
    getRangeLabel,
    normalizeSettings,
  };
})(window);
