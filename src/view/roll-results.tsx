import * as React from "react";
import { flatten, isArray } from "lodash-es";
import Result from "src/model/result";
import Symbols from "src/model/symbols";
import SymbolDisplay from "src/view/display/symbol";
import { adjudicateRoll, removeOpposingSymbols } from "src/util/adjudicate";
import { orderSymbols } from "src/util/order";
import { AllowedResults } from "src/model/dice";

type RollResultsContent = {
    symbols: Symbols[];
    numbers: number[];
};

function splitResults(results: AllowedResults[]): RollResultsContent {
    const resultSymbols: Symbols[][] = [],
          resultNumbers: number[] = [];

    results.forEach(result => {
        if (typeof result === "number") {
            resultNumbers.push(result);
        } else if (isArray(result)) {
            resultSymbols.push(result);
        }
    });

    return {
        symbols: flatten(resultSymbols).sort(orderSymbols),
        numbers: resultNumbers
    };
}

function renderResultGroup(
    keyPrefix: string,
    symbols: Symbols[],
    numbers: number[],
    emptyLabel: string
): JSX.Element {
    const elements: JSX.Element[] = [];

    if (symbols.length) {
        elements.push(
            <div key={`${keyPrefix}-symbols`} className={`group symbolic ${symbols.length > 8 ? "large" : ""}`}>
                {symbols.map((symbol, index) =>
                    <SymbolDisplay key={`${keyPrefix}-symbol-${index}`} symbol={symbol}/>
                )}
            </div>
        );
    }

    elements.push(...numbers.map((score, index) =>
        <div key={`${keyPrefix}-numeric-${index}`} className="group numeric">{score}</div>
    ));

    if (!elements.length) {
        elements.push(
            <div key={`${keyPrefix}-empty`} className="group empty-result">{emptyLabel}</div>
        );
    }

    return <div className="roll-results__groups">{elements}</div>;
}

const RollResults: React.SFC<{ results: AllowedResults[] }> = ({ results }) => {
    let status: Result = Result.NEUTRAL;
    const rawRoll = splitResults(results);
    const hasSymbolRoll = rawRoll.symbols.length > 0;
    const hasNumberRoll = rawRoll.numbers.length > 0;

    if (!hasSymbolRoll && !hasNumberRoll) {
        return <div className={`roll-results ${status}`}></div>;
    }

    const adjudicatedSymbols = hasSymbolRoll
        ? removeOpposingSymbols(rawRoll.symbols).sort(orderSymbols)
        : [];

    if (hasSymbolRoll) {
        status = adjudicateRoll(adjudicatedSymbols);
    }

    return <div className={`roll-results ${status}`}>
        <div className="roll-results__section roll-results__section--raw">
            <div className="roll-results__label">Бросок</div>
            {renderResultGroup("raw", rawRoll.symbols, rawRoll.numbers, "Нет символов")}
        </div>

        <div className="roll-results__section roll-results__section--summary">
            <div className="roll-results__label">Итог</div>
            {renderResultGroup("summary", adjudicatedSymbols, rawRoll.numbers, "Нет оставшихся символов")}
        </div>
    </div>;
};

export default RollResults;
