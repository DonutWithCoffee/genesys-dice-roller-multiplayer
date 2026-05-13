import { AllowedDice, AllowedResults } from "src/model/dice";

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

  if (selected.length) {
    selected.forEach(die => die.roll());

    return {
      dice,
      selected: [],
      results: dice.map(die => die.currentResult)
    };
  }

  return {
    dice,
    selected: [],
    results: dice.map(die => die.roll())
  };
}