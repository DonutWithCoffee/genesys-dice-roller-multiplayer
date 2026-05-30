import { countBy } from "lodash-es";
import Result from "src/model/result";
import Symbols from "src/model/symbols";

/**
 * Method used to resolve part of the roll where successes and failures /
 * advantages and threats cancel each other out. Given list of symbols,
 * cancels them out and returns the list with only the remaining symbols.
 *
 * @param symbols  List of symbols rolled
 * @returns        List with symbols remaining after cancelling results out
 */
function pushRepeated(target: Symbols[], symbol: Symbols, count: number): void {
    for (let index = 0; index < count; index++) {
        target.push(symbol);
    }
}

export function removeOpposingSymbols(symbols: Symbols[]): Symbols[] {

    const counts = countBy(symbols);

    const triumphs = counts[Symbols.TRIUMPH] || 0;
    const despairs = counts[Symbols.DESPAIR] || 0;

    const successes = counts[Symbols.SUCCESS] || 0;
    const failures = counts[Symbols.FAILURE] || 0;

    const advantages = counts[Symbols.ADVANTAGE] || 0;
    const threats = counts[Symbols.THREAT] || 0;

    const successBalance = successes + triumphs - failures - despairs;
    const advantageBalance = advantages - threats;

    const remainingSymbols: Symbols[] = [];

    pushRepeated(remainingSymbols, Symbols.TRIUMPH, triumphs);
    pushRepeated(remainingSymbols, Symbols.DESPAIR, despairs);

    if (successBalance > 0) {
        pushRepeated(remainingSymbols, Symbols.SUCCESS, Math.max(0, successBalance - triumphs));
    } else if (successBalance < 0) {
        pushRepeated(remainingSymbols, Symbols.FAILURE, Math.max(0, -successBalance - despairs));
    }

    if (advantageBalance > 0) {
        pushRepeated(remainingSymbols, Symbols.ADVANTAGE, advantageBalance);
    } else if (advantageBalance < 0) {
        pushRepeated(remainingSymbols, Symbols.THREAT, -advantageBalance);
    }

    return remainingSymbols;
}

/**
 * Resolves the roll; given the list of results rolled, counts them up,
 * and returns whether the roll was successful or failed.
 *
 * @param symbols  Lisf of symbols rolled
 * @results        Whether the roll was successful or failed
 */
export function adjudicateRoll(symbols: Symbols[]): Result {

    const counts = countBy(symbols),
          countSuccess = (counts[Symbols.TRIUMPH] || 0) + (counts[Symbols.SUCCESS] || 0),
          countFailure = (counts[Symbols.DESPAIR] || 0) + (counts[Symbols.FAILURE] || 0);

    return (countSuccess - countFailure > 0) ? Result.SUCCESS : Result.FAILURE;
}
