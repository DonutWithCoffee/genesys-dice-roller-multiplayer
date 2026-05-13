import { AllowedDice, AllowedResults } from "src/model/dice";

export function applyResultsToDice(
  dice: AllowedDice[],
  results: AllowedResults[]
): AllowedDice[] {
  dice.forEach((die, index) => {
    const result = index < results.length ? results[index] : null;

    die.currentResult = result as never;

    if (result !== null) {
      die.rollCount++;
    }
  });

  return dice;
}