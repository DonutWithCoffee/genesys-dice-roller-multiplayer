import * as React from "react";
import { difference } from "lodash-es";

import { AllowedDice, AllowedResults } from "src/model/dice";

import DiceControls from "src/view/dice-controls";
import DiceList from "src/view/dice-list";
import RollResults from "src/view/roll-results";

import { orderDice } from "src/util/order";

import { rollDiceLocally } from "src/service/roll-service";

import { applyResultsToDice } from "src/model/dice-result-sync";
import {
  createLocalRollRequest,
  deserializeRollResults,
  RollResult
} from "src/model/roll-contracts";
import {
  createMultiplayerSocketClient,
  getRoomIdFromPath,
  MultiplayerSocketClient
} from "src/network/socket-client";

type MainAppAreaState = {
  dice: AllowedDice[];
  selected: AllowedDice[];
  results: AllowedResults[];
  roomId: string | null;
};

export default class MainAppArea extends React.Component<{}, MainAppAreaState> {
    private multiplayerClient: MultiplayerSocketClient | null = null;

  constructor(props: {}) {
    super(props);

this.state = {
  dice: [],
  selected: [],
  results: [],
  roomId: getRoomIdFromPath(window.location.pathname)
};

    this.addDie = this.addDie.bind(this);
    this.clearDice = this.clearDice.bind(this);
    this.toggleSelection = this.toggleSelection.bind(this);
    this.roll = this.roll.bind(this);
    this.applyRemoteRollResult = this.applyRemoteRollResult.bind(this);
  }

componentDidMount(): void {
  const { roomId } = this.state;

  if (!roomId) {
    return;
  }

  this.multiplayerClient = createMultiplayerSocketClient(roomId, {
    onRollResult: this.applyRemoteRollResult,
    onRollError: error => {
      console.error("Roll error", error);
    },
    onRoomError: error => {
      console.error("Room error", error);
    }
  });
}

componentWillUnmount(): void {
  if (this.multiplayerClient) {
    this.multiplayerClient.disconnect();
    this.multiplayerClient = null;
  }
}

applyRemoteRollResult(result: RollResult): void {
  const results = deserializeRollResults(result.results);
  const dice = applyResultsToDice(this.state.dice, results);

  this.setState({
    ...this.state,
    dice,
    selected: [],
    results
  });
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
  const { dice, selected, roomId } = this.state;

  if (this.multiplayerClient && roomId) {
    this.multiplayerClient.requestRoll(createLocalRollRequest({
      dice,
      selected,
      roomId,
      visibility: "public"
    }));

    return;
  }

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