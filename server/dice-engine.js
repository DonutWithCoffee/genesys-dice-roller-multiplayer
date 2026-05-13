const SYMBOLS = {
  SUCCESS: "s",
  FAILURE: "f",
  ADVANTAGE: "a",
  THREAT: "h",
  TRIUMPH: "t",
  DESPAIR: "d"
};

const DICE_FACES = {
  ability: [
    [],
    [SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS, SYMBOLS.SUCCESS],
    [SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE],
    [SYMBOLS.SUCCESS, SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE, SYMBOLS.ADVANTAGE]
  ],

  proficiency: [
    [],
    [SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS, SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS, SYMBOLS.SUCCESS],
    [SYMBOLS.ADVANTAGE],
    [SYMBOLS.SUCCESS, SYMBOLS.ADVANTAGE],
    [SYMBOLS.SUCCESS, SYMBOLS.ADVANTAGE],
    [SYMBOLS.SUCCESS, SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE, SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE, SYMBOLS.ADVANTAGE],
    [SYMBOLS.TRIUMPH]
  ],

  boost: [
    [],
    [],
    [SYMBOLS.SUCCESS],
    [SYMBOLS.SUCCESS, SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE, SYMBOLS.ADVANTAGE],
    [SYMBOLS.ADVANTAGE]
  ],

  difficulty: [
    [],
    [SYMBOLS.FAILURE],
    [SYMBOLS.FAILURE, SYMBOLS.FAILURE],
    [SYMBOLS.THREAT],
    [SYMBOLS.THREAT],
    [SYMBOLS.THREAT],
    [SYMBOLS.THREAT, SYMBOLS.THREAT],
    [SYMBOLS.FAILURE, SYMBOLS.THREAT]
  ],

  challenge: [
    [],
    [SYMBOLS.FAILURE],
    [SYMBOLS.FAILURE],
    [SYMBOLS.FAILURE, SYMBOLS.FAILURE],
    [SYMBOLS.FAILURE, SYMBOLS.FAILURE],
    [SYMBOLS.THREAT],
    [SYMBOLS.THREAT],
    [SYMBOLS.FAILURE, SYMBOLS.THREAT],
    [SYMBOLS.FAILURE, SYMBOLS.THREAT],
    [SYMBOLS.THREAT, SYMBOLS.THREAT],
    [SYMBOLS.THREAT, SYMBOLS.THREAT],
    [SYMBOLS.DESPAIR]
  ],

  setback: [
    [],
    [],
    [SYMBOLS.FAILURE],
    [SYMBOLS.FAILURE],
    [SYMBOLS.THREAT],
    [SYMBOLS.THREAT]
  ]
};

const ALLOWED_DICE_TYPES = new Set([
  "ability",
  "proficiency",
  "boost",
  "difficulty",
  "challenge",
  "setback",
  "percentile"
]);

const ALLOWED_VISIBILITY = new Set([
  "public",
  "gm_hidden"
]);

const MAX_DICE_PER_ROLL = 100;

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneSerializedResult(result) {
  if (Array.isArray(result)) {
    return result.slice();
  }

  if (typeof result === "number" || result === null) {
    return result;
  }

  return null;
}

function rollPercentile() {
  return Math.ceil(Math.random() * 100);
}

function rollGenesysDie(type) {
  const faces = DICE_FACES[type];
  const result = faces[Math.floor(Math.random() * faces.length)];

  return result.slice();
}

function rollDie(descriptor) {
  if (descriptor.type === "percentile") {
    return rollPercentile();
  }

  return rollGenesysDie(descriptor.type);
}

function validateRollRequest(request) {
  const errors = [];

  if (!request || typeof request !== "object") {
    return {
      ok: false,
      errors: ["roll_request payload must be an object"]
    };
  }

  if (typeof request.id !== "string" || !request.id.trim()) {
    errors.push("request.id must be a non-empty string");
  }

  if (
    request.roomId !== null &&
    request.roomId !== undefined &&
    typeof request.roomId !== "string"
  ) {
    errors.push("request.roomId must be a string or null");
  }

  if (
    request.rollerId !== null &&
    request.rollerId !== undefined &&
    typeof request.rollerId !== "string"
  ) {
    errors.push("request.rollerId must be a string or null");
  }

  if (
    request.rollerName !== null &&
    request.rollerName !== undefined &&
    typeof request.rollerName !== "string"
  ) {
    errors.push("request.rollerName must be a string or null");
  }

  if (!ALLOWED_VISIBILITY.has(request.visibility)) {
    errors.push("request.visibility must be public or gm_hidden");
  }

  if (!request.pool || typeof request.pool !== "object") {
    errors.push("request.pool must be an object");

    return {
      ok: errors.length === 0,
      errors
    };
  }

  if (!Array.isArray(request.pool.dice)) {
    errors.push("request.pool.dice must be an array");
  } else if (request.pool.dice.length > MAX_DICE_PER_ROLL) {
    errors.push(`request.pool.dice cannot contain more than ${MAX_DICE_PER_ROLL} dice`);
  } else {
    request.pool.dice.forEach((descriptor, index) => {
      if (!descriptor || typeof descriptor !== "object") {
        errors.push(`request.pool.dice[${index}] must be an object`);
        return;
      }

      if (!ALLOWED_DICE_TYPES.has(descriptor.type)) {
        errors.push(`request.pool.dice[${index}].type is invalid`);
      }
    });
  }

  if (!Array.isArray(request.pool.selectedIndexes)) {
    errors.push("request.pool.selectedIndexes must be an array");
  } else if (Array.isArray(request.pool.dice)) {
    const usedIndexes = new Set();

    request.pool.selectedIndexes.forEach((index, selectedIndexPosition) => {
      if (!Number.isInteger(index)) {
        errors.push(`request.pool.selectedIndexes[${selectedIndexPosition}] must be an integer`);
        return;
      }

      if (index < 0 || index >= request.pool.dice.length) {
        errors.push(`request.pool.selectedIndexes[${selectedIndexPosition}] is out of range`);
        return;
      }

      if (usedIndexes.has(index)) {
        errors.push(`request.pool.selectedIndexes[${selectedIndexPosition}] is duplicated`);
        return;
      }

      usedIndexes.add(index);
    });
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function normalizeRequest(request) {
  return {
    id: request.id.trim(),
    roomId: typeof request.roomId === "string" && request.roomId.trim()
      ? request.roomId.trim()
      : null,
    rollerId: typeof request.rollerId === "string" && request.rollerId.trim()
      ? request.rollerId.trim()
      : null,
    rollerName: typeof request.rollerName === "string" && request.rollerName.trim()
      ? request.rollerName.trim()
      : null,
    visibility: request.visibility,
    pool: {
      dice: request.pool.dice.map(descriptor => ({
        type: descriptor.type
      })),
      selectedIndexes: request.pool.selectedIndexes.slice()
    }
  };
}

function executeRollRequest(request, previousResults) {
  const validation = validateRollRequest(request);

  if (!validation.ok) {
    return {
      ok: false,
      errors: validation.errors
    };
  }

  const normalizedRequest = normalizeRequest(request);
  const dice = normalizedRequest.pool.dice;
  const selectedIndexes = normalizedRequest.pool.selectedIndexes;

  let results;

  if (selectedIndexes.length) {
    results = Array.isArray(previousResults) && previousResults.length === dice.length
      ? previousResults.map(cloneSerializedResult)
      : dice.map(() => null);

    selectedIndexes.forEach(index => {
      results[index] = rollDie(dice[index]);
    });
  } else {
    results = dice.map(rollDie);
  }

  return {
    ok: true,
    result: {
      id: createId("roll_result"),
      requestId: normalizedRequest.id,
      roomId: normalizedRequest.roomId,
      rollerId: normalizedRequest.rollerId,
      rollerName: normalizedRequest.rollerName,
      visibility: normalizedRequest.visibility,
      results,
      createdAt: Date.now()
    }
  };
}

module.exports = {
  executeRollRequest,
  validateRollRequest
};