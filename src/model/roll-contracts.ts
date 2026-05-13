import { AllowedDice, AllowedResults } from "src/model/dice";
import {
  createDicePoolDescriptor,
  DicePoolDescriptor
} from "src/model/dice-descriptor";

export type RollVisibility = "public" | "gm_hidden";

export type RollSymbol =
  | "s"
  | "f"
  | "a"
  | "h"
  | "t"
  | "d";

export type SerializedRollResult = RollSymbol[] | number | null;

export type RollRequest = {
  id: string;
  roomId: string | null;
  rollerId: string | null;
  rollerName: string | null;
  visibility: RollVisibility;
  pool: DicePoolDescriptor;
};

export type RollResult = {
  id: string;
  requestId: string;
  roomId: string | null;
  rollerId: string | null;
  rollerName: string | null;
  visibility: RollVisibility;
  pool: DicePoolDescriptor;
  results: SerializedRollResult[];
  createdAt: number;
};

export type CreateLocalRollRequestInput = {
  dice: AllowedDice[];
  selected: AllowedDice[];
  roomId?: string | null;
  rollerId?: string | null;
  rollerName?: string | null;
  visibility?: RollVisibility;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createLocalRollRequest(input: CreateLocalRollRequestInput): RollRequest {
  return {
    id: createId("roll_request"),
    roomId: input.roomId || null,
    rollerId: input.rollerId || null,
    rollerName: input.rollerName || null,
    visibility: input.visibility || "public",
    pool: createDicePoolDescriptor(input.dice, input.selected)
  };
}

export function serializeRollResults(results: AllowedResults[]): SerializedRollResult[] {
  return results.map(result => {
    if (Array.isArray(result)) {
      return result.slice() as RollSymbol[];
    }

    return result as number | null;
  });
}

export function deserializeRollResults(results: SerializedRollResult[]): AllowedResults[] {
  return results.map(result => {
    if (Array.isArray(result)) {
      return result.slice() as AllowedResults;
    }

    return result as AllowedResults;
  });
}

export function createRollResult(
  request: RollRequest,
  results: AllowedResults[],
  createdAt: number = Date.now()
): RollResult {
  return {
    id: createId("roll_result"),
    requestId: request.id,
    roomId: request.roomId,
    rollerId: request.rollerId,
    rollerName: request.rollerName,
    visibility: request.visibility,
    pool: request.pool,
    results: serializeRollResults(results),
    createdAt
  };
}