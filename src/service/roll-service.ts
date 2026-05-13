import { AllowedDice, AllowedResults } from "src/model/dice";
import {
  createLocalRollRequest,
  createRollResult,
  deserializeRollResults
} from "src/model/roll-contracts";

export type RollServiceInput = {
  dice: AllowedDice[];
  selected: AllowedDice[];
};

export type RollServiceOutput = {
  dice: AllowedDice[];
  selected: AllowedDice[];
  results: AllowedResults[];
};

export function rollDiceLocally(input: RollServiceInput): RollServiceOutput {
  const { dice, selected } = input;
  const request = createLocalRollRequest({ dice, selected });

  let rolledResults: AllowedResults[];

  if (request.pool.selectedIndexes.length) {
    request.pool.selectedIndexes.forEach(index => {
      dice[index].roll();
    });

    rolledResults = dice.map(die => die.currentResult);
  } else {
    rolledResults = dice.map(die => die.roll());
  }

  const result = createRollResult(request, rolledResults);

  return {
    dice,
    selected: [],
    results: deserializeRollResults(result.results)
  };
}