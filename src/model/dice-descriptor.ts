import {
  AbilityDie,
  AllowedDice,
  BoostDie,
  ChallengeDie,
  DifficultyDie,
  PercentileDie,
  ProficiencyDie,
  SetbackDie
} from "src/model/dice";

export type DiceType =
  | "ability"
  | "proficiency"
  | "boost"
  | "difficulty"
  | "challenge"
  | "setback"
  | "percentile";

export type DiceDescriptor = {
  type: DiceType;
};

export type DicePoolDescriptor = {
  dice: DiceDescriptor[];
  selectedIndexes: number[];
};

export function dieToDescriptor(die: AllowedDice): DiceDescriptor {
  if (die instanceof AbilityDie) {
    return { type: "ability" };
  }

  if (die instanceof ProficiencyDie) {
    return { type: "proficiency" };
  }

  if (die instanceof BoostDie) {
    return { type: "boost" };
  }

  if (die instanceof DifficultyDie) {
    return { type: "difficulty" };
  }

  if (die instanceof ChallengeDie) {
    return { type: "challenge" };
  }

  if (die instanceof SetbackDie) {
    return { type: "setback" };
  }

  if (die instanceof PercentileDie) {
    return { type: "percentile" };
  }

  throw new Error("Unsupported die type");
}

export function descriptorToDie(descriptor: DiceDescriptor): AllowedDice {
  switch (descriptor.type) {
    case "ability":
      return new AbilityDie();

    case "proficiency":
      return new ProficiencyDie();

    case "boost":
      return new BoostDie();

    case "difficulty":
      return new DifficultyDie();

    case "challenge":
      return new ChallengeDie();

    case "setback":
      return new SetbackDie();

    case "percentile":
      return new PercentileDie();

    default:
      throw new Error("Unsupported dice descriptor");
  }
}

export function createDicePoolDescriptor(
  dice: AllowedDice[],
  selected: AllowedDice[]
): DicePoolDescriptor {
  return {
    dice: dice.map(dieToDescriptor),
    selectedIndexes: dice
      .map((die, index) => selected.includes(die) ? index : -1)
      .filter(index => index !== -1)
  };
}

export function recreateDicePool(descriptors: DiceDescriptor[]): AllowedDice[] {
  return descriptors.map(descriptorToDie);
}