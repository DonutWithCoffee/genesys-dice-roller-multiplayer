import * as React from "react";
import { difference } from "lodash-es";

import { AllowedDice, AllowedResults } from "src/model/dice";

import DiceControls from "src/view/dice-controls";
import DiceList from "src/view/dice-list";
import RollResults from "src/view/roll-results";

import { orderDice } from "src/util/order";

import { rollDiceLocally } from "src/service/roll-service";

type MainAppAreaState = {
  dice: AllowedDice[];
  selected: AllowedDice[];
  results: AllowedResults[];
};

export default class MainAppArea extends React.Component<{}, MainAppAreaState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      dice: [],
      selected: [],
      results: []
    };

    this.addDie = this.addDie.bind(this);
    this.clearDice = this.clearDice.bind(this);
    this.toggleSelection = this.toggleSelection.bind(this);
    this.roll = this.roll.bind(this);
  }

  addDie(newDie: AllowedDice): void {
    const { dice } = this.state;

    this.setState({
      ...this.state,
      dice: dice.concat([newDie]).sort(orderDice)
    });
  }

  clearDice(): void {
    const { dice, selected } = this.state;

    if (selected.length) {
      const remainingDice = difference(dice, selected);

      this.setState({
        dice: remainingDice,
        selected: [],
        results: remainingDice.map(die => die.currentResult)
      });
    } else {
      this.setState({
        dice: [],
        selected: [],
        results: []
      });
    }
  }

  toggleSelection(toggledDie: AllowedDice): void {
    const { selected } = this.state;

    if (selected.includes(toggledDie)) {
      this.setState({
        ...this.state,
        selected: selected.filter(die => die !== toggledDie)
      });
    } else {
      this.setState({
        ...this.state,
        selected: selected.concat([toggledDie])
      });
    }
  }

roll(): void {
  const { dice, selected } = this.state;

  this.setState(rollDiceLocally({
    dice,
    selected
  }));
}

  render() {
    return <div className="dice-area">
      <DiceControls callback={this.addDie} />

      <div className="results-container">
        <DiceList
          dice={this.state.dice}
          selected={this.state.selected}
          selectCallback={this.toggleSelection}
        />

        <RollResults results={this.state.results} />
      </div>

      <div className="actions">
        <button id="roll" onClick={this.roll}>
          {this.state.selected.length ? "Re-roll Selected" : "Roll"}
        </button>

        <button id="clear" onClick={this.clearDice}>
          {this.state.selected.length ? "Remove Selected" : "Clear"}
        </button>
      </div>
    </div>;
  }
}