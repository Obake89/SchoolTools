(function attachNumberLineMath(globalObject) {
  const POINT_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const TASK_TYPE_CONFIG = {
    natural: {
      id: "natural",
      min: 0,
      max: 12,
      step: 1,
      values: createIntegerValues(0, 12),
    },
    integer: {
      id: "integer",
      min: -10,
      max: 10,
      step: 1,
      values: createIntegerValues(-10, 10),
    },
    commonFraction: {
      id: "commonFraction",
      min: 0,
      max: 4,
      step: 0.25,
      values: createFractionValues(0, 4, [2, 4]),
    },
    decimal: {
      id: "decimal",
      min: 0,
      max: 5,
      step: 0.1,
      values: createDecimalValues(0, 5, 0.1),
    },
    rational: {
      id: "rational",
      min: -4,
      max: 4,
      step: 0.25,
      values: createSignedRationalValues(-4, 4),
    },
  };

  function createIntegerValues(min, max) {
    const values = [];

    for (let value = min; value <= max; value += 1) {
      values.push(createValueEntry(value, String(value), "integer"));
    }

    return values;
  }

  function createFractionValues(min, max, denominators) {
    const map = new Map();

    for (let whole = min; whole <= max; whole += 1) {
      map.set(whole, createFormattedFractionEntry(whole, "fraction"));
    }

    for (let denominatorIndex = 0; denominatorIndex < denominators.length; denominatorIndex += 1) {
      const denominator = denominators[denominatorIndex];

      for (let numerator = 1; numerator <= max * denominator; numerator += 1) {
        const value = numerator / denominator;

        if (value < min || value > max || Number.isInteger(value)) {
          continue;
        }

        map.set(
          value,
          createFormattedFractionEntry(value, "fraction"),
        );
      }
    }

    return Array.from(map.values()).sort(compareEntriesByValue);
  }

  function createDecimalValues(min, max, step) {
    const values = [];
    const factor = 10;

    for (
      let scaledValue = Math.round(min * factor);
      scaledValue <= Math.round(max * factor);
      scaledValue += Math.round(step * factor)
    ) {
      const value = scaledValue / factor;
      values.push(
        createValueEntry(value, value.toFixed(1).replace(".", ","), "decimal"),
      );
    }

    return values;
  }

  function createSignedRationalValues(min, max) {
    const map = new Map();

    for (let value = min; value <= max; value += 1) {
      map.set(value, createFormattedFractionEntry(value, "rational"));
    }

    for (let numerator = min * 4; numerator <= max * 4; numerator += 1) {
      const value = numerator / 4;

      if (value < min || value > max || Number.isInteger(value)) {
        continue;
      }

      map.set(
        value,
        createFormattedFractionEntry(value, "rational"),
      );
    }

    return Array.from(map.values()).sort(compareEntriesByValue);
  }

  function compareEntriesByValue(left, right) {
    return left.value - right.value;
  }

  function createValueEntry(value, latex, kind) {
    return {
      value,
      latex,
      plainText: convertLatexToPlainText(latex),
      html: convertPlainTextToHtml(convertLatexToPlainText(latex)),
      kind,
    };
  }

  function createFormattedFractionEntry(value, kind) {
    const fractionParts = getMixedFractionParts(value);

    return {
      value,
      latex: formatMixedFractionAsLatex(fractionParts),
      plainText: formatMixedFractionAsPlainText(fractionParts),
      html: formatMixedFractionAsHtml(fractionParts),
      kind,
    };
  }

  function convertLatexToPlainText(latex) {
    const fractionMatch = latex.match(/^(-?)\\frac\{(\d+)\}\{(\d+)\}$/);

    if (fractionMatch) {
      return `${fractionMatch[1]}${fractionMatch[2]}/${fractionMatch[3]}`;
    }

    return latex;
  }

  function convertPlainTextToHtml(plainText) {
    return plainText.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
  }

  function getMixedFractionParts(value) {
    const denominator = 4;
    const sign = value < 0 ? "-" : "";
    const absoluteNumerator = Math.round(Math.abs(value) * denominator);
    const wholePart = Math.floor(absoluteNumerator / denominator);
    const remainder = absoluteNumerator % denominator;

    if (remainder === 0) {
      return {
        sign,
        wholePart,
        numerator: 0,
        denominator: 1,
      };
    }

    const greatestCommonDivisor = getGreatestCommonDivisor(remainder, denominator);

    return {
      sign,
      wholePart,
      numerator: remainder / greatestCommonDivisor,
      denominator: denominator / greatestCommonDivisor,
    };
  }

  function formatMixedFractionAsLatex(parts) {
    const signPrefix = parts.sign === "-" ? "-" : "";

    if (parts.numerator === 0) {
      return `${signPrefix}${parts.wholePart}`;
    }

    const fractionLatex = `\\frac{${parts.numerator}}{${parts.denominator}}`;

    if (parts.wholePart === 0) {
      return `${signPrefix}${fractionLatex}`;
    }

    return `${signPrefix}${parts.wholePart}${fractionLatex}`;
  }

  function formatMixedFractionAsPlainText(parts) {
    const signPrefix = parts.sign === "-" ? "-" : "";

    if (parts.numerator === 0) {
      return `${signPrefix}${parts.wholePart}`;
    }

    const fractionText = `${parts.numerator}/${parts.denominator}`;

    if (parts.wholePart === 0) {
      return `${signPrefix}${fractionText}`;
    }

    return `${signPrefix}${parts.wholePart} ${fractionText}`;
  }

  function formatMixedFractionAsHtml(parts) {
    const signHtml = parts.sign === "-" ? '<span class="fraction-sign">-</span>' : "";

    if (parts.numerator === 0) {
      return `${signHtml}<span>${parts.wholePart}</span>`;
    }

    const fractionHtml =
      `<span class="axis-fraction">` +
      `<span class="axis-fraction__top">${parts.numerator}</span>` +
      `<span class="axis-fraction__bottom">${parts.denominator}</span>` +
      `</span>`;

    if (parts.wholePart === 0) {
      return `${signHtml}${fractionHtml}`;
    }

    return (
      `${signHtml}<span class="mixed-number">` +
      `<span class="mixed-number__whole">${parts.wholePart}</span>` +
      `${fractionHtml}` +
      `</span>`
    );
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

  function getTaskTypeConfig(taskType) {
    return TASK_TYPE_CONFIG[taskType] ?? TASK_TYPE_CONFIG.integer;
  }

  function getAllowedPointCount(taskType, requestedCount) {
    const config = getTaskTypeConfig(taskType);
    const safeCount = Number(requestedCount) || 3;
    return Math.max(2, Math.min(safeCount, Math.min(6, config.values.length)));
  }

  function selectUniqueEntries(values, count) {
    const shuffled = shuffleList(values);
    return shuffled.slice(0, count).sort(compareEntriesByValue);
  }

  function shuffleList(items) {
    const result = [...items];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
  }

  function generatePlacementTask(settings) {
    const taskType = settings?.taskType ?? "integer";
    const pointCount = getAllowedPointCount(taskType, settings?.pointCount);
    const config = getTaskTypeConfig(taskType);
    const entries = selectUniqueEntries(config.values, pointCount);

    return {
      taskType,
      pointCount,
      range: {
        min: config.min,
        max: config.max,
        step: config.step,
      },
      points: entries.map((entry, index) => ({
        label: POINT_LABELS[index],
        value: entry.value,
        latex: entry.latex,
        plainText: entry.plainText,
      })),
    };
  }

  function checkPlacementAnswer(task, positions) {
    const results = task.points.map((point, index) => {
      const position = Number(positions[index]);
      return {
        label: point.label,
        expected: point.value,
        actual: position,
        isCorrect: areValuesEqual(position, point.value),
      };
    });

    return createResultSummary(results);
  }

  function generateReadingTask(settings) {
    const taskType = settings?.taskType ?? "integer";
    const pointCount = getAllowedPointCount(taskType, settings?.pointCount);
    const config = getTaskTypeConfig(taskType);
    const entries = selectUniqueEntries(config.values, pointCount);

    return {
      taskType,
      pointCount,
      range: {
        min: config.min,
        max: config.max,
        step: config.step,
      },
      points: entries.map((entry, index) => ({
        label: POINT_LABELS[index],
        value: entry.value,
        latex: entry.latex,
        plainText: entry.plainText,
      })),
    };
  }

  function checkReadingAnswer(task, answers) {
    const results = task.points.map((point) => {
      const actual = parseAnswerValue(answers[point.label]);
      return {
        label: point.label,
        expected: point.value,
        actual,
        isCorrect: actual !== null && areValuesEqual(actual, point.value),
      };
    });

    return createResultSummary(results);
  }

  function createResultSummary(results) {
    const correctCount = results.filter((result) => result.isCorrect).length;

    return {
      correctCount,
      totalCount: results.length,
      isCorrect: correctCount === results.length,
      results,
    };
  }

  function areValuesEqual(left, right) {
    return Math.abs(left - right) < 0.000001;
  }

  function parseAnswerValue(rawValue) {
    if (rawValue && typeof rawValue === "object") {
      return parseStructuredFractionAnswer(rawValue);
    }

    if (typeof rawValue !== "string") {
      return null;
    }

    const normalizedValue = rawValue.replace(/\s+/g, "").replace(",", ".");

    if (!normalizedValue) {
      return null;
    }

    if (normalizedValue.includes("/")) {
      const parts = normalizedValue.split("/");

      if (parts.length !== 2) {
        return null;
      }

      const numerator = Number(parts[0]);
      const denominator = Number(parts[1]);

      if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return null;
      }

      return numerator / denominator;
    }

    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function parseStructuredFractionAnswer(rawValue) {
    const wholeText = String(rawValue.whole ?? "").trim();
    const numeratorText = String(rawValue.numerator ?? "").trim();
    const denominatorText = String(rawValue.denominator ?? "").trim();

    if (!wholeText && !numeratorText && !denominatorText) {
      return null;
    }

    const whole = wholeText ? Number(wholeText.replace(",", ".")) : 0;

    if (!Number.isFinite(whole)) {
      return null;
    }

    if (!numeratorText && !denominatorText) {
      return whole;
    }

    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);

    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return null;
    }

    const sign = whole < 0 ? -1 : 1;
    const absoluteWhole = Math.abs(whole);
    return sign * (absoluteWhole + numerator / denominator);
  }

  function formatLabeledValuesAsLatex(points) {
    return points.map((point) => `${point.label} = ${point.latex}`).join(",\\ ");
  }

  function formatValueForDisplay(value) {
    const roundedValue = Math.round(value * 100) / 100;

    if (Number.isInteger(roundedValue)) {
      return String(roundedValue);
    }

    return String(roundedValue).replace(".", ",");
  }

  function getValueLabel(taskType, value) {
    const config = getTaskTypeConfig(taskType);
    const matchingEntry = config.values.find((entry) => {
      return areValuesEqual(entry.value, value);
    });

    if (matchingEntry) {
      return matchingEntry.plainText.replace(".", ",");
    }

    return formatValueForDisplay(value);
  }

  function getValueLabelHtml(taskType, value) {
    const config = getTaskTypeConfig(taskType);
    const matchingEntry = config.values.find((entry) => {
      return areValuesEqual(entry.value, value);
    });

    if (matchingEntry) {
      return matchingEntry.html;
    }

    return convertPlainTextToHtml(formatValueForDisplay(value));
  }

  function getAxisLabelValues(range) {
    const values = [];
    const totalSteps = Math.round((range.max - range.min) / range.step);

    for (let index = 0; index <= totalSteps; index += 1) {
      values.push(roundToStep(range.min + index * range.step));
    }

    const firstIndex = Math.floor(Math.random() * values.length);
    let secondIndex = Math.floor(Math.random() * values.length);

    while (secondIndex === firstIndex) {
      secondIndex = Math.floor(Math.random() * values.length);
    }

    return [values[firstIndex], values[secondIndex]].sort((left, right) => left - right);
  }

  function getTickDisplayStep(range, anchorValues) {
    if (!Array.isArray(anchorValues) || anchorValues.length < 2) {
      return range.step;
    }

    const segmentCount = Math.round(
      Math.abs(anchorValues[1] - anchorValues[0]) / range.step,
    );

    if (segmentCount > 0 && segmentCount % 3 === 0) {
      return roundToStep(range.step * 3);
    }

    if (segmentCount > 0 && segmentCount % 2 === 0) {
      return roundToStep(range.step * 2);
    }

    return range.step;
  }

  function roundToStep(value) {
    return Math.round(value * 100) / 100;
  }

  globalObject.NumberLineMath = {
    formatLabeledValuesAsLatex,
    formatValueForDisplay,
    generatePlacementTask,
    checkPlacementAnswer,
    generateReadingTask,
    checkReadingAnswer,
    getAxisLabelValues,
    getAllowedPointCount,
    getTickDisplayStep,
    getValueLabel,
    getValueLabelHtml,
  };
})(window);
