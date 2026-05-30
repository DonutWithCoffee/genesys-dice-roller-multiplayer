import * as React from "react";

import Result from "src/model/result";
import Symbols from "src/model/symbols";
import SymbolDisplay from "src/view/display/symbol";
import { adjudicateRoll, removeOpposingSymbols } from "src/util/adjudicate";
import { orderSymbols } from "src/util/order";
import { AllowedResults } from "src/model/dice";

type RollResultsProps = {
  results: AllowedResults[];
  highlightedIndexes?: number[];
};

function countSymbol(symbols: Symbols[], symbolToCount: Symbols): number {
  return symbols.filter(symbol => symbol === symbolToCount).length;
}

function formatRussianCount(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return `${count} ${many}`;
  }

  if (last === 1) {
    return `${count} ${one}`;
  }

  if (last >= 2 && last <= 4) {
    return `${count} ${few}`;
  }

  return `${count} ${many}`;
}

function buildFinalSummary(symbols: Symbols[]): string | null {
  if (!symbols.length) {
    return null;
  }

  const successes = countSymbol(symbols, Symbols.SUCCESS);
  const failures = countSymbol(symbols, Symbols.FAILURE);
  const advantages = countSymbol(symbols, Symbols.ADVANTAGE);
  const threats = countSymbol(symbols, Symbols.THREAT);
  const triumphs = countSymbol(symbols, Symbols.TRIUMPH);
  const despairs = countSymbol(symbols, Symbols.DESPAIR);

  const successBalance = successes + triumphs - failures - despairs;
  const advantageBalance = advantages - threats;

  const parts: string[] = [];

  if (successBalance > 0) {
    parts.push(formatRussianCount(successBalance, "итоговый успех", "итоговых успеха", "итоговых успехов"));
  } else if (successBalance < 0) {
    parts.push(formatRussianCount(-successBalance, "итоговый провал", "итоговых провала", "итоговых провалов"));
  }

  if (advantageBalance > 0) {
    parts.push(formatRussianCount(advantageBalance, "преимущество", "преимущества", "преимуществ"));
  } else if (advantageBalance < 0) {
    parts.push(formatRussianCount(-advantageBalance, "угроза", "угрозы", "угроз"));
  }

  if (triumphs > 0) {
    parts.push(formatRussianCount(triumphs, "триумф", "триумфа", "триумфов"));
  }

  if (despairs > 0) {
    parts.push(formatRussianCount(despairs, "отчаяние", "отчаяния", "отчаяний"));
  }

  const checkStatus = successBalance > 0
    ? "Проверка успешна"
    : "Проверка провалена";

  if (!parts.length) {
    return `${checkStatus}: без дополнительных символов.`;
  }

  return `${checkStatus}: ${parts.join(", ")}.`;
}

const RollResults: React.SFC<RollResultsProps> = ({ results, highlightedIndexes = [] }) => {
  let status: Result = Result.NEUTRAL;

  const symbolResults: Symbols[] = [];
  const numberResults: number[] = [];
  const highlightedIndexSet = new Set<number>(highlightedIndexes);

  results.forEach(result => {
    if (typeof result === "number") {
      numberResults.push(result);
      return;
    }

    if (Array.isArray(result)) {
      symbolResults.push(...result);
    }
  });

  const finalSymbols = removeOpposingSymbols(symbolResults).sort(orderSymbols);
  const finalSummary = buildFinalSummary(symbolResults);
  const hasResults = results.length > 0;

  if (symbolResults.length) {
    status = adjudicateRoll(symbolResults);
  }

  return <div className={`roll-results ${status}`}>
    <div className="roll-results__section roll-results__section--raw">
      <div className="roll-results__label">Бросок</div>

      <div className="roll-results__groups">
        {results.map((result, resultIndex) => {
          const isHighlighted = highlightedIndexSet.has(resultIndex);
          const highlightClass = isHighlighted ? " is-rerolled" : "";

          if (typeof result === "number") {
            return <div
              className={`group numeric roll-results__die-result${highlightClass}`}
              key={`raw-number-${resultIndex}-${result}`}
            >
              {result}
            </div>;
          }

          if (Array.isArray(result) && result.length) {
            return <div
              className={`group symbolic roll-results__die-result${highlightClass}`}
              key={`raw-symbols-${resultIndex}`}
            >
              {result.map((symbol, symbolIndex) =>
                <SymbolDisplay
                  symbol={symbol}
                  key={`raw-symbol-${resultIndex}-${symbolIndex}-${symbol}`}
                />
              )}
            </div>;
          }

          return <div
            className={`group empty-result roll-results__die-result${highlightClass}`}
            key={`raw-empty-${resultIndex}`}
          >
            —
          </div>;
        })}

        {!hasResults &&
          <div className="group empty-result" key="empty-raw">—</div>}
      </div>
    </div>

    <div className="roll-results__section roll-results__section--final">
      <div className="roll-results__label">Итог</div>

      <div className="roll-results__groups">
        {finalSymbols.length
          ? <div className={`group symbolic ${finalSymbols.length > 8 ? "large" : ""}`} key="symbolic-final">
            {finalSymbols.map((symbol, index) =>
              <SymbolDisplay
                symbol={symbol}
                key={`final-symbol-${index}-${symbol}`}
              />
            )}
          </div>
          : symbolResults.length
            ? <div className="group empty-result" key="neutral-final">Нейтрально</div>
            : null}

        {numberResults.map((score, index) =>
          <div className="group numeric" key={`number-final-${index}-${score}`}>{score}</div>
        )}

        {!symbolResults.length && !numberResults.length &&
          <div className="group empty-result" key="empty-final">—</div>}
      </div>
    </div>

    {finalSummary &&
      <div className="roll-results__summary">
        {finalSummary}
      </div>}
  </div>;
};

export default RollResults;