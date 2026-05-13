import { AllowedDice, AllowedResults } from "src/model/dice";
import { createDicePoolDescriptor } from "src/model/dice-descriptor";

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
  const poolDescriptor = createDicePoolDescriptor(dice, selected);

  if (poolDescriptor.selectedIndexes.length) {
    poolDescriptor.selectedIndexes.forEach(index => {
      dice[index].roll();
    });

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