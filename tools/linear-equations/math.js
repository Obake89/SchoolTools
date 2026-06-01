(function attachLinearEquationsMath(globalObject) {
  const DIFFICULTY_OPTIONS = [
    {
      id: "easy",
      label: "easy",
      title: "Klasa 5",
      description: "Równania z dodawaniem i odejmowaniem prostych wyrażeń.",
    },
    {
      id: "medium",
      label: "medium",
      title: "Klasy 6-7",
      description: "Równania z nawiasami oraz mnożeniem lub dzieleniem przez liczbę.",
    },
    {
      id: "hard",
      label: "hard",
      title: "Klasy 7-8",
      description: "Równania z wyrażeniami po obu stronach i kilkoma przekształceniami.",
    },
  ];

  const TASK_GENERATORS = {
    easy: [createEasyAdditionTask, createEasySubtractionTask, createEasyMixedTask],
    medium: [
      createMediumProductTask,
      createMediumDivisionTask,
      createMediumTwoStepTask,
    ],
    hard: [createHardBalancedProductTask, createHardReductionTask, createHardDivisionTask],
  };

  function createFraction(numerator, denominator = 1) {
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
      throw new Error("Fraction values must be integers and denominator cannot be zero.");
    }

    if (numerator === 0) {
      return { numerator: 0, denominator: 1 };
    }

    const divisor = getGreatestCommonDivisor(Math.abs(numerator), Math.abs(denominator));
    const normalizedDenominator = denominator / divisor;
    const normalizedNumerator = numerator / divisor;

    if (normalizedDenominator < 0) {
      return {
        numerator: -normalizedNumerator,
        denominator: -normalizedDenominator,
      };
    }

    return {
      numerator: normalizedNumerator,
      denominator: normalizedDenominator,
    };
  }

  function addFractions(left, right) {
    return createFraction(
      left.numerator * right.denominator + right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  }

  function subtractFractions(left, right) {
    return createFraction(
      left.numerator * right.denominator - right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  }

  function multiplyFractions(left, right) {
    return createFraction(
      left.numerator * right.numerator,
      left.denominator * right.denominator,
    );
  }

  function divideFractions(left, right) {
    if (right.numerator === 0) {
      throw new Error("Cannot divide by zero.");
    }

    return createFraction(
      left.numerator * right.denominator,
      left.denominator * right.numerator,
    );
  }

  function negateFraction(value) {
    return createFraction(-value.numerator, value.denominator);
  }

  function areFractionsEqual(left, right) {
    return (
      left.numerator === right.numerator && left.denominator === right.denominator
    );
  }

  function isZeroFraction(value) {
    return value.numerator === 0;
  }

  function isOneFraction(value) {
    return value.numerator === value.denominator;
  }

  function isNegativeOneFraction(value) {
    return value.numerator === -value.denominator;
  }

  function createExpression(xNumerator = 0, constantNumerator = 0) {
    return {
      x: createFraction(xNumerator, 1),
      constant: createFraction(constantNumerator, 1),
    };
  }

  function cloneExpression(expression) {
    return {
      x: createFraction(expression.x.numerator, expression.x.denominator),
      constant: createFraction(
        expression.constant.numerator,
        expression.constant.denominator,
      ),
    };
  }

  function addExpressions(left, right) {
    return {
      x: addFractions(left.x, right.x),
      constant: addFractions(left.constant, right.constant),
    };
  }

  function subtractExpressions(left, right) {
    return {
      x: subtractFractions(left.x, right.x),
      constant: subtractFractions(left.constant, right.constant),
    };
  }

  function multiplyExpressionByFraction(expression, factor) {
    return {
      x: multiplyFractions(expression.x, factor),
      constant: multiplyFractions(expression.constant, factor),
    };
  }

  function divideExpressionByFraction(expression, factor) {
    return {
      x: divideFractions(expression.x, factor),
      constant: divideFractions(expression.constant, factor),
    };
  }

  function createEquation(left, right) {
    return {
      left: cloneExpression(left),
      right: cloneExpression(right),
    };
  }

  function cloneEquation(equation) {
    return createEquation(equation.left, equation.right);
  }

  function createFragment(label, latex, expression) {
    return {
      id: "",
      label,
      latex,
      expression: cloneExpression(expression),
    };
  }

  function createConstantFragment(value, isLeading = false) {
    const absoluteValue = Math.abs(value);
    const prefix = value < 0 ? "-" : isLeading ? "" : "+";
    const separator = prefix ? `${prefix} ` : "";
    return createFragment(
      `${separator}${absoluteValue}`,
      `${separator}${absoluteValue}`,
      createExpression(0, value),
    );
  }

  function createVariableFragment(coefficient = 1, isLeading = false) {
    const absoluteValue = Math.abs(coefficient);
    let termText = "x";

    if (absoluteValue !== 1) {
      termText = `${absoluteValue}x`;
    }

    const prefix = coefficient < 0 ? "-" : isLeading ? "" : "+";
    const separator = prefix ? `${prefix} ` : "";
    return createFragment(
      `${separator}${termText}`,
      `${separator}${termText}`,
      createExpression(coefficient, 0),
    );
  }

  function createProductFragment(multiplier, offset) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    return createFragment(
      `${multiplier}(x ${sign} ${absoluteOffset})`,
      `${multiplier}(x ${sign} ${absoluteOffset})`,
      createExpression(multiplier, multiplier * offset),
    );
  }

  function createGroupedSumFragment(offset) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    return createFragment(
      `(x ${sign} ${absoluteOffset})`,
      `\\left(x ${sign} ${absoluteOffset}\\right)`,
      createExpression(1, offset),
    );
  }

  function buildAlgebraicConstantLatex(constantValue, variant = 0) {
    if (variant % 3 === 0) {
      return `x - x + ${constantValue}`;
    }

    if (variant % 3 === 1) {
      return `2x - x - x + ${constantValue}`;
    }

    return `x + x - 2x + ${constantValue}`;
  }

  function buildAlgebraicConstantLabel(constantValue, variant = 0) {
    return buildAlgebraicConstantLatex(constantValue, variant);
  }

  function createSumProductFragment(offset, factorValue, variant = 0) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    const algebraicFactorLabel = buildAlgebraicConstantLabel(factorValue, variant);
    const algebraicFactorLatex = buildAlgebraicConstantLatex(factorValue, variant);
    return createFragment(
      `(x ${sign} ${absoluteOffset})(${algebraicFactorLabel})`,
      `\\left(x ${sign} ${absoluteOffset}\\right)\\left(${algebraicFactorLatex}\\right)`,
      createExpression(factorValue, factorValue * offset),
    );
  }

  function createDivisionFragment(offset, divisor) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    return createFragment(
      `(x ${sign} ${absoluteOffset}) : ${divisor}`,
      `\\frac{x ${sign} ${absoluteOffset}}{${divisor}}`,
      {
        x: createFraction(1, divisor),
        constant: createFraction(offset, divisor),
      },
    );
  }

  function createSumDivisionFragment(offset, divisorValue, variant = 0) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    const algebraicDivisorLabel = buildAlgebraicConstantLabel(divisorValue, variant);
    const algebraicDivisorLatex = buildAlgebraicConstantLatex(divisorValue, variant);
    return createFragment(
      `(x ${sign} ${absoluteOffset}) : (${algebraicDivisorLabel})`,
      `\\frac{x ${sign} ${absoluteOffset}}{${algebraicDivisorLatex}}`,
      {
        x: createFraction(1, divisorValue),
        constant: createFraction(offset, divisorValue),
      },
    );
  }

  function createNegativeGroupFragment(offset) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteOffset = Math.abs(offset);
    return createFragment(
      `- (x ${sign} ${absoluteOffset})`,
      `-\\left(x ${sign} ${absoluteOffset}\\right)`,
      createExpression(-1, -offset),
    );
  }

  function createCancelingVariableFragments() {
    const sign = Math.random() < 0.5 ? 1 : -1;
    return [createVariableFragment(sign), createVariableFragment(-sign)];
  }

  function splitIntoNonTrivialConstants(total) {
    const safeTotal = Math.max(4, total);
    const first = randomInt(2, safeTotal - 2);
    return [first, safeTotal - first];
  }

  function pickMediumNumberSumPair() {
    return pickRandom([
      [2, 2],
      [2, 3],
      [3, 2],
      [2, 4],
      [4, 2],
      [3, 3],
    ]);
  }

  function pickHardNumberSumPair() {
    return pickRandom([
      [2, 3],
      [3, 2],
      [2, 4],
      [4, 2],
      [3, 3],
      [3, 4],
      [4, 3],
    ]);
  }

  function createMonomialTilePool(equation, difficulty, customTilePoolText = "") {
    const leftTiles = createRequiredMonomialTiles(equation.left, "left");
    const rightTiles = createRequiredMonomialTiles(equation.right, "right");
    const requiredTiles = [...leftTiles, ...rightTiles];

    if (customTilePoolText) {
      return {
        leftTiles,
        rightTiles,
        poolTiles: createCustomMonomialTilePool(
          leftTiles,
          rightTiles,
          customTilePoolText,
        ),
      };
    }

    const extras = createExtraMonomialTiles(
      requiredTiles,
      difficulty,
      Math.max(3, requiredTiles.length - 1),
    );

    return {
      leftTiles,
      rightTiles,
      poolTiles: shuffleList([...requiredTiles, ...extras]),
    };
  }

  function createCustomMonomialTilePool(leftTiles, rightTiles, customTilePoolText) {
    const requiredTiles = [...leftTiles, ...rightTiles];
    const groupedRequiredTiles = new Map();

    requiredTiles.forEach((tile) => {
      if (!groupedRequiredTiles.has(tile.label)) {
        groupedRequiredTiles.set(tile.label, []);
      }

      groupedRequiredTiles.get(tile.label).push(tile);
    });

    const poolTiles = [];
    const customLabels = parseCustomTilePoolLabels(customTilePoolText);

    customLabels.forEach((label, index) => {
      const matchingRequiredTiles = groupedRequiredTiles.get(label);

      if (matchingRequiredTiles && matchingRequiredTiles.length > 0) {
        poolTiles.push(matchingRequiredTiles.shift());
        return;
      }

      poolTiles.push(createExtraTileFromLabel(label, index));
    });

    groupedRequiredTiles.forEach((remainingTiles) => {
      remainingTiles.forEach((tile) => {
        poolTiles.push(tile);
      });
    });

    return poolTiles;
  }

  function parseCustomTilePoolLabels(value) {
    return String(value || "")
      .split(/[|;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function createExtraTileFromLabel(label, index) {
    const parsedExpression = parseLinearExpression(label);

    return {
      id: `extra-custom-${index}-${sanitizeIdPart(label) || "zero"}`,
      side: "extra",
      order: index,
      required: false,
      label,
      latex: formatExpressionAsLatex(parsedExpression),
      expression: parsedExpression,
    };
  }

  function createRequiredMonomialTiles(expression, side) {
    const tiles = [];

    if (!isZeroFraction(expression.x)) {
      tiles.push(createMonomialTile({ type: "variable", value: expression.x }, side, tiles.length));
    }

    if (!isZeroFraction(expression.constant) || tiles.length === 0) {
      tiles.push(
        createMonomialTile(
          { type: "constant", value: expression.constant },
          side,
          tiles.length,
        ),
      );
    }

    return tiles;
  }

  function createMonomialTile(term, side, order) {
    const label =
      term.type === "variable"
        ? formatVariableMonomialAsPlainText(term.value)
        : formatFractionAsPlainText(term.value);
    const latex =
      term.type === "variable"
        ? formatVariableMonomialAsLatex(term.value)
        : formatFractionAsLatex(term.value);
    const expression =
      term.type === "variable"
        ? { x: term.value, constant: createFraction(0, 1) }
        : { x: createFraction(0, 1), constant: term.value };

    return {
      id: `${side}-${order}-${sanitizeIdPart(label) || "zero"}`,
      side,
      order,
      required: true,
      label,
      latex,
      expression,
    };
  }

  function createExtraMonomialTiles(requiredTiles, difficulty, count) {
    const usedLabels = new Set(requiredTiles.map((tile) => tile.label));
    const extras = [];

    while (extras.length < count) {
      const candidate = buildRandomExtraMonomialTile(difficulty);

      if (usedLabels.has(candidate.label)) {
        continue;
      }

      usedLabels.add(candidate.label);
      extras.push({
        ...candidate,
        id: `extra-${extras.length}-${sanitizeIdPart(candidate.label) || "zero"}`,
        side: "extra",
        order: extras.length,
        required: false,
      });
    }

    return extras;
  }

  function buildRandomExtraMonomialTile(difficulty) {
    if (difficulty === "easy") {
      const builders = [
        () => createExtraConstantTile(randomInt(-9, 9)),
        () => createExtraVariableTile(createFraction(randomInt(-4, 4) || 2, 1)),
      ];

      return pickRandom(builders)();
    }

    if (difficulty === "medium") {
      const builders = [
        () => createExtraConstantTile(randomInt(-12, 12)),
        () => createExtraVariableTile(createFraction(randomInt(-6, 6) || -3, 1)),
        () => createExtraConstantTile(createFraction(pickRandom([1, 3, 5, 7]), 2)),
        () => createExtraVariableTile(createFraction(pickRandom([1, 3, 5]), 2)),
      ];

      return pickRandom(builders)();
    }

    const builders = [
      () => createExtraConstantTile(randomInt(-15, 15)),
      () => createExtraVariableTile(createFraction(randomInt(-8, 8) || 4, 1)),
      () => createExtraConstantTile(createFraction(pickRandom([-7, -5, -3, 3, 5, 7]), 2)),
      () => createExtraVariableTile(createFraction(pickRandom([-5, -3, 3, 5]), 2)),
    ];

    return pickRandom(builders)();
  }

  function createExtraConstantTile(value) {
    const safeValue = typeof value === "number" ? createFraction(value, 1) : value;

    return {
      label: formatFractionAsPlainText(safeValue),
      latex: formatFractionAsLatex(safeValue),
      expression: {
        x: createFraction(0, 1),
        constant: safeValue,
      },
      required: false,
    };
  }

  function createExtraVariableTile(value) {
    return {
      label: formatVariableMonomialAsPlainText(value),
      latex: formatVariableMonomialAsLatex(value),
      expression: {
        x: value,
        constant: createFraction(0, 1),
      },
      required: false,
    };
  }

  function createTask(difficulty = "easy") {
    const safeDifficulty = TASK_GENERATORS[difficulty] ? difficulty : "easy";
    const generator = pickRandom(TASK_GENERATORS[safeDifficulty]);
    const task = generator();
    const simplifiedEquation = createEquation(
      task.initialEquation.left,
      task.initialEquation.right,
    );
    const tilePoolData = createMonomialTilePool(simplifiedEquation, safeDifficulty);

    return {
      ...task,
      difficulty: safeDifficulty,
      leftTiles: tilePoolData.leftTiles,
      rightTiles: tilePoolData.rightTiles,
      poolTiles: tilePoolData.poolTiles,
      originalEquationLatex: buildOriginalEquationLatex(task.leftFragments, task.rightFragments),
      simplifiedEquationLatex: formatEquationAsLatex(simplifiedEquation),
      currentEquation: simplifiedEquation,
    };
  }

  function createTaskFromSheetRow(row) {
    const difficulty = String(row?.difficulty || "easy").trim().toLowerCase();
    const safeDifficulty = TASK_GENERATORS[difficulty] ? difficulty : "easy";
    const simplifiedEquation = createEquation(
      parseLinearExpression(String(row?.simplifiedLeft || "")),
      parseLinearExpression(String(row?.simplifiedRight || "")),
    );
    const tilePoolData = createMonomialTilePool(
      simplifiedEquation,
      safeDifficulty,
      String(row?.tilePool || ""),
    );
    const sourceEquationLatex =
      String(row?.sourceEquationLatex || "").trim() ||
      formatEquationAsLatex(simplifiedEquation);
    const difficultyMeta = getDifficultyMeta(safeDifficulty);

    return {
      difficulty: safeDifficulty,
      title:
        String(row?.title || "").trim() ||
        `Równanie z listy - ${difficultyMeta.title}`,
      instructions:
        String(row?.instructions || "").trim() ||
        "Najpierw ułóż uproszczoną postać równania z jednomianów, a potem rozwiąż je krok po kroku.",
      group: String(row?.group || "").trim(),
      leftFragments: [],
      rightFragments: [],
      initialEquation: simplifiedEquation,
      solution: null,
      leftTiles: tilePoolData.leftTiles,
      rightTiles: tilePoolData.rightTiles,
      poolTiles: tilePoolData.poolTiles,
      originalEquationLatex: sourceEquationLatex,
      simplifiedEquationLatex: formatEquationAsLatex(simplifiedEquation),
      currentEquation: simplifiedEquation,
      source: "sheet",
      taskId: String(row?.taskId || "").trim(),
    };
  }

  function createEasyAdditionTask() {
    const solution = randomInt(3, 12);
    const offset = randomInt(2, 6);
    const target = solution + offset;
    const [first, second] = splitIntoNonTrivialConstants(target);
    const cancelingFragments = createCancelingVariableFragments();

    const leftFragments = [createVariableFragment(1, true), createConstantFragment(offset)];
    const rightFragments = [
      createConstantFragment(first, true),
      cancelingFragments[0],
      createConstantFragment(second),
      cancelingFragments[1],
    ];

    return createTaskPayload({
      difficulty: "easy",
      title: "Dodaj i odejmij wyrazy podobne",
      instructions:
        "Najpierw uprość obie strony równania, a potem wykonuj takie same operacje po obu stronach.",
      leftFragments,
      rightFragments,
      solution,
    });
  }

  function createEasySubtractionTask() {
    const solution = randomInt(4, 12);
    const offset = randomInt(2, Math.min(5, solution - 1));
    const target = solution - offset;
    const minuend = target + randomInt(3, 7);
    const subtrahend = minuend - target;
    const cancelingFragments = createCancelingVariableFragments();

    const leftFragments = [createVariableFragment(1, true), createConstantFragment(-offset)];
    const rightFragments = [
      createConstantFragment(minuend, true),
      cancelingFragments[0],
      createConstantFragment(-subtrahend),
      cancelingFragments[1],
    ];

    return createTaskPayload({
      difficulty: "easy",
      title: "Odczytaj różnicę po prawej stronie",
      instructions:
        "Zwróć uwagę na znak minus i sprawdź, jak zmienia się równanie po każdym kroku.",
      leftFragments,
      rightFragments,
      solution,
    });
  }

  function createEasyMixedTask() {
    const solution = randomInt(3, 11);
    const offset = randomInt(2, 6);
    const target = solution + offset;
    const first = target + randomInt(3, 6);
    const second = first - target;
    const cancelingFragments = createCancelingVariableFragments();

    const leftFragments = [createConstantFragment(offset, true), createVariableFragment(1)];
    const rightFragments = [
      createConstantFragment(first, true),
      cancelingFragments[0],
      createConstantFragment(-second),
      cancelingFragments[1],
    ];

    return createTaskPayload({
      difficulty: "easy",
      title: "Uporządkuj równanie z sumą algebraiczną",
      instructions:
        "Po lewej stronie masz x z liczbą, a po prawej prostą sumę algebraiczną.",
      leftFragments,
      rightFragments,
      solution,
    });
  }

  function createMediumProductTask() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const solution = randomInt(2, 8);
      const multiplier = randomInt(2, 4);
      const offset = randomInt(1, 4);
      const rightOffset = randomInt(1, 4);
      const extraConstant = multiplier * (solution + offset) - solution - rightOffset;

      if (extraConstant < 2 || extraConstant > 12) {
        continue;
      }

      const leftFragments = [createProductFragment(multiplier, offset)];
      const rightFragments = [
        createGroupedSumFragment(rightOffset),
        createConstantFragment(extraConstant),
      ];

      return createTaskPayload({
        difficulty: "medium",
        title: "Mnożenie sumy przez jednomian",
        instructions:
          "Najpierw otwórz nawias i uprość obie strony, bo po prawej stronie też masz sumę algebraiczną.",
        leftFragments,
        rightFragments,
        solution,
      });
    }

    return createMediumFallbackTask();
  }

  function createMediumDivisionTask() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const [firstAddend, secondAddend] = pickMediumNumberSumPair();
      const divisor = firstAddend + secondAddend;
      const solution = randomInt(3, 8);
      const groupedOffset = randomInt(1, 3);
      const extraConstant = randomInt(2, 6);
      const offset = divisor * (solution - groupedOffset + extraConstant) - solution;

      if (offset < 1 || offset > 10) {
        continue;
      }

        return createTaskPayload({
          difficulty: "medium",
          title: "Iloraz sumy algebraicznej",
          instructions:
            "Najpierw uprość obie strony, a potem usuń dzielenie przez algebraiczną sumę w mianowniku.",
          leftFragments: [createSumDivisionFragment(offset, divisor, attempt)],
          rightFragments: [
            createGroupedSumFragment(-groupedOffset),
            createConstantFragment(extraConstant),
          ],
        solution,
      });
    }

    return createMediumFallbackTask();
  }

  function createMediumTwoStepTask() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const solution = randomInt(2, 8);
      const [firstAddend, secondAddend] = pickMediumNumberSumPair();
      const factor = firstAddend + secondAddend;
      const offset = randomInt(1, 4);
      const rightOffset = randomInt(1, 3);
      const extraConstant = factor * (solution + offset) - solution - rightOffset;

      if (extraConstant < 2 || extraConstant > 12) {
        continue;
      }

      const leftFragments = [createSumProductFragment(offset, factor, attempt)];
      const rightFragments = [
        createGroupedSumFragment(rightOffset),
        createConstantFragment(extraConstant),
      ];

      return createTaskPayload({
        difficulty: "medium",
        title: "Iloczyn dwóch sum",
        instructions:
          "Najpierw uprość iloczyn dwóch sum, a potem zauważ, że po prawej stronie też jest suma algebraiczna.",
        leftFragments,
        rightFragments,
        solution,
      });
    }

    return createMediumFallbackTask();
  }

  function createHardBalancedProductTask() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const [leftFirst, leftSecond] = pickHardNumberSumPair();
      const leftFactor = leftFirst + leftSecond;
      const rightMultiplier = randomInt(2, 4);
      const solution = randomInt(2, 8);
      const offsetLeft = randomInt(1, 4);
      const offsetRight = randomInt(1, 3);
      const extraConstant =
        leftFactor * (solution + offsetLeft) - rightMultiplier * (solution + offsetRight);

      if (extraConstant < 2 || extraConstant > 12) {
        continue;
      }

        return createTaskPayload({
          difficulty: "hard",
          title: "Iloczyn sum po obu stronach",
          instructions:
            "Uprość najpierw iloczyn sum po lewej stronie i mnożenie sumy przez jednomian po prawej.",
          leftFragments: [createSumProductFragment(offsetLeft, leftFactor, attempt)],
          rightFragments: [
            createProductFragment(rightMultiplier, offsetRight),
            createConstantFragment(extraConstant),
          ],
        solution,
      });
    }

    return createHardFallbackTask();
  }

  function createHardReductionTask() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const [leftFirst, leftSecond] = pickHardNumberSumPair();
      const [rightFirst, rightSecond] = pickHardNumberSumPair();
      const leftFactor = leftFirst + leftSecond;
      const rightFactor = rightFirst + rightSecond;
      const solution = randomInt(2, 7);
      const offsetLeft = randomInt(1, 4);
      const offsetRight = randomInt(1, 4);
      const extraConstant =
        leftFactor * (solution + offsetLeft) - rightFactor * (solution + offsetRight);

      if (extraConstant < 2 || extraConstant > 12) {
        continue;
      }

        return createTaskPayload({
          difficulty: "hard",
          title: "Dwa iloczyny sum algebraicznych",
          instructions:
            "Obie strony trzeba uprościć z nawiasów, a dopiero potem przejść do rozwiązywania.",
          leftFragments: [createSumProductFragment(offsetLeft, leftFactor, attempt)],
          rightFragments: [
            createSumProductFragment(offsetRight, rightFactor, attempt + 1),
            createConstantFragment(extraConstant),
          ],
          solution,
        });
    }

    return createHardFallbackTask();
  }

  function createHardDivisionTask() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const leftMultiplier = randomInt(2, 4);
      const leftOffset = randomInt(1, 4);
      const [firstAddend, secondAddend] = pickHardNumberSumPair();
      const divisor = firstAddend + secondAddend;
      const solution = randomInt(2, 7);
      const quotientValue = randomInt(2, 7);
      const rightOffset = quotientValue * divisor - solution;

      if (rightOffset < 1 || rightOffset > 10) {
        continue;
      }
      const leftValue = leftMultiplier * (solution + leftOffset);
      const extraConstant = leftValue - quotientValue;

      if (extraConstant < 2 || extraConstant > 12) {
        continue;
      }

        return createTaskPayload({
          difficulty: "hard",
          title: "Mnożenie po jednej stronie, iloraz po drugiej",
          instructions:
            "Po uproszczeniu dostaniesz równanie z wyrazami po obu stronach, więc trzeba będzie je jeszcze uporządkować.",
          leftFragments: [createProductFragment(leftMultiplier, leftOffset)],
          rightFragments: [
            createSumDivisionFragment(rightOffset, divisor, attempt),
            createConstantFragment(extraConstant),
          ],
          solution,
        });
    }

    return createHardFallbackTask();
  }

  function createMediumFallbackTask() {
    return createTaskPayload({
      difficulty: "medium",
      title: "Mnożenie sumy i porządkowanie obu stron",
      instructions:
        "Najpierw uprość iloczyn po lewej stronie, a potem uporządkuj sumę algebraiczną po prawej.",
      leftFragments: [createProductFragment(3, 2)],
      rightFragments: [createGroupedSumFragment(3), createConstantFragment(5)],
      solution: 4,
    });
  }

  function createHardFallbackTask() {
    return createTaskPayload({
      difficulty: "hard",
      title: "Iloczyn sum i mnożenie po obu stronach",
      instructions:
        "Najpierw uprość obie strony do sum algebraicznych, a dopiero potem rozwiązuj równanie.",
      leftFragments: [createSumProductFragment(2, 3)],
      rightFragments: [createProductFragment(2, 1), createConstantFragment(7)],
      solution: 3,
    });
  }

  function createTaskPayload({
    difficulty,
    title,
    instructions,
    leftFragments,
    rightFragments,
    solution,
  }) {
    return {
      difficulty,
      title,
      instructions,
      leftFragments,
      rightFragments,
      initialEquation: createEquation(
        sumFragmentExpressions(leftFragments),
        sumFragmentExpressions(rightFragments),
      ),
      solution: createFraction(solution, 1),
    };
  }

  function sumFragmentExpressions(fragments) {
    return fragments.reduce((result, fragment) => {
      return addExpressions(result, fragment.expression);
    }, createExpression(0, 0));
  }

  function buildOriginalEquationLatex(leftFragments, rightFragments) {
    return `${joinFragmentLatex(leftFragments)} = ${joinFragmentLatex(rightFragments)}`;
  }

  function joinFragmentLatex(fragments) {
    return fragments.map((fragment) => fragment.latex).join(" ");
  }

  function validateArrangement(task, placedLeftIds, placedRightIds) {
    const expectedLeftIds = task.leftTiles
      .slice()
      .sort(compareTilesByOrder)
      .map((tile) => tile.id);
    const expectedRightIds = task.rightTiles
      .slice()
      .sort(compareTilesByOrder)
      .map((tile) => tile.id);
    const safeLeftIds = Array.isArray(placedLeftIds) ? placedLeftIds : [];
    const safeRightIds = Array.isArray(placedRightIds) ? placedRightIds : [];
    const leftMatches = areStringListsEqualAsSets(expectedLeftIds, safeLeftIds);
    const rightMatches = areStringListsEqualAsSets(expectedRightIds, safeRightIds);
    const placedIds = new Set([...safeLeftIds, ...safeRightIds]);
    const requiredIds = new Set([...expectedLeftIds, ...expectedRightIds]);
    const extraCount = Array.from(placedIds).filter((id) => !requiredIds.has(id)).length;
    const missingCount =
      expectedLeftIds.length +
      expectedRightIds.length -
      Array.from(requiredIds).filter((id) => placedIds.has(id)).length;

    return {
      isCorrect: leftMatches && rightMatches,
      leftMatches,
      rightMatches,
      extraCount,
      missingCount,
    };
  }

  function parseMonomial(rawValue) {
    if (typeof rawValue !== "string") {
      return { isValid: false, message: "Wpisz jednomian, na przykład 3, -2 albo x." };
    }

    const normalizedValue = rawValue.replace(/\s+/g, "").replace(",", ".");

    if (!normalizedValue) {
      return { isValid: false, message: "Pole z operacją jest jeszcze puste." };
    }

    if (normalizedValue.includes(".")) {
      return {
        isValid: false,
        message: "W tej wersji wpisuj liczby całkowite albo ułamki zwykłe, bez przecinków.",
      };
    }

    const variableMatch = normalizedValue.match(/^([+-]?)(\d+(?:\/\d+)?)?x$/);

    if (variableMatch) {
      const sign = variableMatch[1] === "-" ? -1 : 1;
      const coefficientText = variableMatch[2] || "1";
      const coefficient = parseFractionText(coefficientText);

      if (!coefficient) {
        return { isValid: false, message: "Nie udało się odczytać współczynnika przy x." };
      }

      return {
        isValid: true,
        kind: "variable",
        value: multiplyFractions(createFraction(sign, 1), coefficient),
        expression: {
          x: multiplyFractions(createFraction(sign, 1), coefficient),
          constant: createFraction(0, 1),
        },
      };
    }

    const constant = parseFractionText(normalizedValue);

    if (!constant) {
      return {
        isValid: false,
        message: "Wpisz jednomian w postaci 5, -3, 2x, -x albo 3/2.",
      };
    }

    return {
      isValid: true,
      kind: "constant",
      value: constant,
      expression: {
        x: createFraction(0, 1),
        constant,
      },
    };
  }

  function applyOperationToEquation(equation, operationType, rawMonomial) {
    const parsedMonomial = parseMonomial(rawMonomial);

    if (!parsedMonomial.isValid) {
      return { isValid: false, message: parsedMonomial.message };
    }

    const validation = validateOperation(operationType, parsedMonomial);

    if (!validation.isValid) {
      return validation;
    }

    const nextEquation = cloneEquation(equation);

    if (operationType === "add") {
      nextEquation.left = addExpressions(nextEquation.left, parsedMonomial.expression);
      nextEquation.right = addExpressions(nextEquation.right, parsedMonomial.expression);
    }

    if (operationType === "subtract") {
      nextEquation.left = subtractExpressions(nextEquation.left, parsedMonomial.expression);
      nextEquation.right = subtractExpressions(nextEquation.right, parsedMonomial.expression);
    }

    if (operationType === "multiply") {
      nextEquation.left = multiplyExpressionByFraction(nextEquation.left, parsedMonomial.value);
      nextEquation.right = multiplyExpressionByFraction(nextEquation.right, parsedMonomial.value);
    }

    if (operationType === "divide") {
      nextEquation.left = divideExpressionByFraction(nextEquation.left, parsedMonomial.value);
      nextEquation.right = divideExpressionByFraction(nextEquation.right, parsedMonomial.value);
    }

    return {
      isValid: true,
      nextEquation,
      beforeLatex: formatEquationAsLatex(equation),
      afterLatex: formatEquationAsLatex(nextEquation),
      operationLabel: formatOperationLabel(operationType, parsedMonomial),
      operationLatex: formatOperationLatex(operationType, parsedMonomial),
    };
  }

  function validateOperation(operationType, monomial) {
    const supportedOperations = ["add", "subtract", "multiply", "divide"];

    if (!supportedOperations.includes(operationType)) {
      return { isValid: false, message: "Wybierz jedną z dostępnych operacji." };
    }

    if ((operationType === "add" || operationType === "subtract") && isZeroMonomial(monomial)) {
      return {
        isValid: false,
        message: "Dodawanie albo odejmowanie zera nic nie zmieni. Wybierz inny jednomian.",
      };
    }

    if (operationType === "multiply" || operationType === "divide") {
      if (monomial.kind !== "constant") {
        return {
          isValid: false,
          message: "Mnożenie i dzielenie w tym narzędziu wykonujemy tylko przez liczbę różną od zera.",
        };
      }

      if (isZeroFraction(monomial.value)) {
        return {
          isValid: false,
          message: "Nie można mnożyć ani dzielić obu stron przez zero.",
        };
      }

      if (isOneFraction(monomial.value)) {
        return {
          isValid: false,
          message: "Mnożenie albo dzielenie przez 1 nic nie zmienia. Spróbuj innej operacji.",
        };
      }
    }

    return { isValid: true };
  }

  function isZeroMonomial(monomial) {
    if (monomial.kind === "constant") {
      return isZeroFraction(monomial.value);
    }

    return isZeroFraction(monomial.expression.x);
  }

  function formatEquationAsLatex(equation) {
    return `${formatExpressionAsLatex(equation.left)} = ${formatExpressionAsLatex(equation.right)}`;
  }

  function formatExpressionAsLatex(expression) {
    const parts = [];

    if (!isZeroFraction(expression.x)) {
      const coefficient = expression.x;

      if (isOneFraction(coefficient)) {
        parts.push("x");
      } else if (isNegativeOneFraction(coefficient)) {
        parts.push("-x");
      } else {
        parts.push(`${formatFractionAsLatex(coefficient)}x`);
      }
    }

    if (!isZeroFraction(expression.constant)) {
      const constantLatex = formatFractionAsLatex(expression.constant);

      if (parts.length === 0) {
        parts.push(constantLatex);
      } else if (expression.constant.numerator > 0) {
        parts.push(`+ ${constantLatex}`);
      } else {
        parts.push(`- ${formatFractionAsLatex(negateFraction(expression.constant))}`);
      }
    }

    if (parts.length === 0) {
      return "0";
    }

    return parts.join(" ");
  }

  function formatFractionAsLatex(value) {
    if (value.denominator === 1) {
      return String(value.numerator);
    }

    const sign = value.numerator < 0 ? "-" : "";
    return `${sign}\\frac{${Math.abs(value.numerator)}}{${value.denominator}}`;
  }

  function formatFractionAsPlainText(value) {
    if (value.denominator === 1) {
      return String(value.numerator);
    }

    return `${value.numerator}/${value.denominator}`;
  }

  function formatVariableMonomialAsPlainText(value) {
    if (isOneFraction(value)) {
      return "x";
    }

    if (isNegativeOneFraction(value)) {
      return "-x";
    }

    return `${formatFractionAsPlainText(value)}x`;
  }

  function formatVariableMonomialAsLatex(value) {
    if (isOneFraction(value)) {
      return "x";
    }

    if (isNegativeOneFraction(value)) {
      return "-x";
    }

    return `${formatFractionAsLatex(value)}x`;
  }

  function formatMonomialPlain(parsedMonomial) {
    if (parsedMonomial.kind === "constant") {
      return formatFractionAsPlainText(parsedMonomial.value);
    }

    return formatVariableMonomialAsPlainText(parsedMonomial.value);
  }

  function formatMonomialLatex(parsedMonomial) {
    if (parsedMonomial.kind === "constant") {
      return formatFractionAsLatex(parsedMonomial.value);
    }

    return formatVariableMonomialAsLatex(parsedMonomial.value);
  }

  function formatOperationLabel(operationType, parsedMonomial) {
    const labels = {
      add: "Dodaj",
      subtract: "Odejmij",
      multiply: "Pomnóż przez",
      divide: "Podziel przez",
    };

    return `${labels[operationType]} ${formatMonomialPlain(parsedMonomial)}`;
  }

  function formatOperationLatex(operationType, parsedMonomial) {
    const labels = {
      add: "+",
      subtract: "-",
      multiply: "\\cdot",
      divide: ":",
    };

    return `${labels[operationType]}\\ ${formatMonomialLatex(parsedMonomial)}`;
  }

  function getEquationStatus(equation) {
    if (areFractionsEqual(equation.left.x, equation.right.x)) {
      if (areFractionsEqual(equation.left.constant, equation.right.constant)) {
        return {
          type: "identity",
          message: "Po uproszczeniu obie strony są takie same. To równanie ma nieskończenie wiele rozwiązań.",
        };
      }

      return {
        type: "contradiction",
        message: "Po uproszczeniu otrzymujemy sprzeczność, więc to równanie nie ma rozwiązania.",
      };
    }

    if (isSolvedForm(equation.left, equation.right)) {
      return {
        type: "solved",
        message: `Brawo! Otrzymaliśmy x = ${formatFractionAsPlainText(equation.right.constant)}.`,
        solution: equation.right.constant,
      };
    }

    if (isSolvedForm(equation.right, equation.left)) {
      return {
        type: "solved",
        message: `Brawo! Otrzymaliśmy x = ${formatFractionAsPlainText(equation.left.constant)}.`,
        solution: equation.left.constant,
      };
    }

    return {
      type: "ongoing",
      message: "Równanie jest poprawne. Wykonaj kolejny krok po obu stronach.",
    };
  }

  function isSolvedForm(variableSide, numericSide) {
    return (
      areFractionsEqual(variableSide.x, createFraction(1, 1)) &&
      isZeroFraction(variableSide.constant) &&
      isZeroFraction(numericSide.x)
    );
  }

  function parseFractionText(value) {
    if (!value) {
      return null;
    }

    if (/^[+-]?\d+$/.test(value)) {
      return createFraction(Number(value), 1);
    }

    const match = value.match(/^([+-]?\d+)\/([+-]?\d+)$/);

    if (!match) {
      return null;
    }

    const numerator = Number(match[1]);
    const denominator = Number(match[2]);

    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
      return null;
    }

    return createFraction(numerator, denominator);
  }

  function parseLinearExpression(value) {
    const normalizedValue = String(value || "")
      .replace(/\s+/g, "")
      .replace(/,/g, ".");

    if (!normalizedValue) {
      throw new Error("Brakuje uproszczonej postaci jednej ze stron równania.");
    }

    const safeExpression = normalizedValue.replace(/-/g, "+-");
    const rawTerms = safeExpression.split("+").filter(Boolean);

    if (!rawTerms.length) {
      throw new Error("Nie udało się odczytać uproszczonego wyrażenia.");
    }

    return rawTerms.reduce(
      function reduceTerms(result, rawTerm) {
        const parsedTerm = parseExpressionTerm(rawTerm);

        if (!parsedTerm) {
          throw new Error(
            `Nie udało się odczytać wyrażenia: ${value}. Użyj postaci typu 3x-4 lub 2x+5.`,
          );
        }

        return addExpressions(result, parsedTerm);
      },
      createExpression(0, 0),
    );
  }

  function parseExpressionTerm(rawTerm) {
    if (rawTerm === "x") {
      return createExpression(1, 0);
    }

    if (rawTerm === "-x") {
      return createExpression(-1, 0);
    }

    if (rawTerm.endsWith("x")) {
      const coefficientText = rawTerm.slice(0, -1);
      const safeCoefficientText =
        coefficientText === "" || coefficientText === "+"
          ? "1"
          : coefficientText === "-"
            ? "-1"
            : coefficientText;
      const coefficient = parseFractionText(safeCoefficientText);

      if (!coefficient) {
        return null;
      }

      return {
        x: coefficient,
        constant: createFraction(0, 1),
      };
    }

    const constant = parseFractionText(rawTerm);

    if (!constant) {
      return null;
    }

    return {
      x: createFraction(0, 1),
      constant,
    };
  }

  function getDifficultyMeta(difficulty) {
    return DIFFICULTY_OPTIONS.find((option) => option.id === difficulty) || DIFFICULTY_OPTIONS[0];
  }

  function compareTilesByOrder(left, right) {
    return left.order - right.order;
  }

  function areStringListsEqual(left, right) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  function areStringListsEqualAsSets(left, right) {
    return areStringListsEqual([...left].sort(), [...right].sort());
  }

  function sanitizeIdPart(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function shuffleList(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(items) {
    return items[randomInt(0, items.length - 1)];
  }

  function getGreatestCommonDivisor(left, right) {
    let a = left;
    let b = right;

    while (b !== 0) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }

    return a;
  }

  globalObject.LinearEquationsMath = {
    DIFFICULTY_OPTIONS,
    applyOperationToEquation,
    cloneEquation,
    createTask,
    createTaskFromSheetRow,
    formatEquationAsLatex,
    formatMonomialPlain,
    getDifficultyMeta,
    getEquationStatus,
    validateArrangement,
  };
})(window);
