import * as React from "react";
import { difference } from "lodash-es";

import { AllowedDice, AllowedResults } from "src/model/dice";
import { recreateDicePool } from "src/model/dice-descriptor";
import { applyResultsToDice } from "src/model/dice-result-sync";
import {
  createLocalRollRequest,
  deserializeRollResults,
  RollResult,
  RollVisibility
} from "src/model/roll-contracts";

import DiceControls from "src/view/dice-controls";
import DiceList from "src/view/dice-list";
import RollResults from "src/view/roll-results";

import { orderDice } from "src/util/order";

import { rollDiceLocally } from "src/service/roll-service";
import {
  createMultiplayerSocketClient,
  getRoomIdFromPath,
  MultiplayerSocketClient,
  PlayerSnapshot,
  RoomSnapshot,
  ServerHello
} from "src/network/socket-client";

type MultiplayerStatus = "local" | "connecting" | "connected" | "disconnected";

type MainAppAreaState = {
  dice: AllowedDice[];
  selected: AllowedDice[];
  results: AllowedResults[];
  roomId: string | null;
  multiplayerStatus: MultiplayerStatus;
  roomPlayerCount: number | null;
  players: PlayerSnapshot[];
  playerName: string;
  isGm: boolean;
  currentSocketId: string | null;
  roomGmId: string | null;
  roomGmName: string | null;
  lastRollerName: string | null;
  lastRollVisibility: RollVisibility | null;
};

function getInitialPlayerName(): string {
  const savedName = window.localStorage.getItem("genesys-player-name");

  if (savedName && savedName.trim()) {
    return savedName.trim().slice(0, 32);
  }

  return `Player-${Math.random().toString(36).slice(2, 6)}`;
}

function getInitialIsGm(): boolean {
  return window.localStorage.getItem("genesys-is-gm") === "true";
}

function normalizePlayerName(playerName: string): string {
  const trimmed = playerName.trim();

  if (!trimmed) {
    return "Player";
  }

  return trimmed.slice(0, 32);
}

export default class MainAppArea extends React.Component<{}, MainAppAreaState> {
  private multiplayerClient: MultiplayerSocketClient | null = null;

  constructor(props: {}) {
    super(props);

    const roomId = getRoomIdFromPath(window.location.pathname);
    const playerName = getInitialPlayerName();
    const isGm = getInitialIsGm();

    this.state = {
      dice: [],
      selected: [],
      results: [],
      roomId,
      multiplayerStatus: roomId ? "connecting" : "local",
      roomPlayerCount: null,
      players: [],
      playerName,
      isGm,
      currentSocketId: null,
      roomGmId: null,
      roomGmName: null,
      lastRollerName: null,
      lastRollVisibility: null
    };

    this.addDie = this.addDie.bind(this);
    this.clearDice = this.clearDice.bind(this);
    this.toggleSelection = this.toggleSelection.bind(this);
    this.roll = this.roll.bind(this);
    this.rollHidden = this.rollHidden.bind(this);
    this.applyServerHello = this.applyServerHello.bind(this);
    this.applyRemoteRollResult = this.applyRemoteRollResult.bind(this);
    this.applyRoomSnapshot = this.applyRoomSnapshot.bind(this);
    this.handlePlayerNameChange = this.handlePlayerNameChange.bind(this);
    this.handleGmChange = this.handleGmChange.bind(this);
  }

  componentDidMount(): void {
    const { roomId, playerName, isGm } = this.state;

    if (!roomId) {
      return;
    }

    this.multiplayerClient = createMultiplayerSocketClient(roomId, playerName, isGm, {
      onConnect: () => {
        this.setState({
          multiplayerStatus: "connecting"
        });
      },
      onDisconnect: () => {
        this.setState({
          multiplayerStatus: "disconnected",
          roomPlayerCount: null,
          players: [],
          currentSocketId: null,
          roomGmId: null,
          roomGmName: null
        });
      },
      onServerHello: this.applyServerHello,
      onRoomJoined: this.applyRoomSnapshot,
      onRoomState: this.applyRoomSnapshot,
      onRollResult: this.applyRemoteRollResult,
      onRollError: error => {
        console.error("Roll error", error);
      },
      onRoomError: error => {
        console.error("Room error", error);

        this.setState({
          multiplayerStatus: "disconnected",
          roomPlayerCount: null,
          players: [],
          roomGmId: null,
          roomGmName: null
        });
      }
    });
  }

  componentWillUnmount(): void {
    if (this.multiplayerClient) {
      this.multiplayerClient.disconnect();
      this.multiplayerClient = null;
    }
  }

  applyServerHello(payload: ServerHello): void {
    this.setState({
      currentSocketId: payload.socketId
    });
  }

  applyRoomSnapshot(snapshot: RoomSnapshot): void {
    const currentPlayer = this.state.currentSocketId
      ? snapshot.players.find(player => player.id === this.state.currentSocketId)
      : null;

    const nextState: Partial<MainAppAreaState> = {
      multiplayerStatus: "connected",
      roomPlayerCount: snapshot.playerCount,
      players: snapshot.players,
      roomGmId: snapshot.gmId,
      roomGmName: snapshot.gmName
    };

    if (currentPlayer && currentPlayer.isGm !== this.state.isGm) {
      nextState.isGm = currentPlayer.isGm;
      window.localStorage.setItem("genesys-is-gm", currentPlayer.isGm ? "true" : "false");
    }

    this.setState(nextState as Pick<MainAppAreaState, keyof MainAppAreaState>);
  }

  applyRemoteRollResult(result: RollResult): void {
    const results = deserializeRollResults(result.results);
    const dice = applyResultsToDice(
      recreateDicePool(result.pool.dice),
      results
    );

    this.setState({
      dice,
      selected: [],
      results,
      lastRollerName: result.rollerName || "Player",
      lastRollVisibility: result.visibility
    });
  }

  syncPlayerState(playerName: string, isGm: boolean): void {
    if (this.multiplayerClient) {
      this.multiplayerClient.updatePlayer(playerName, isGm);
    }
  }

  handlePlayerNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const playerName = event.target.value.slice(0, 32);

    window.localStorage.setItem("genesys-player-name", playerName);

    this.setState({
      playerName
    });

    this.syncPlayerState(playerName, this.state.isGm);
  }

  handleGmChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const isGm = event.target.checked;

    window.localStorage.setItem("genesys-is-gm", isGm ? "true" : "false");

    this.setState({
      isGm
    });

    this.syncPlayerState(this.state.playerName, isGm);
  }

  addDie(newDie: AllowedDice): void {
    const { dice } = this.state;

    this.setState({
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

      return;
    }

    this.setState({
      dice: [],
      selected: [],
      results: [],
      lastRollerName: null,
      lastRollVisibility: null
    });
  }

  toggleSelection(toggledDie: AllowedDice): void {
    const { selected } = this.state;

    if (selected.includes(toggledDie)) {
      this.setState({
        selected: selected.filter(die => die !== toggledDie)
      });

      return;
    }

    this.setState({
      selected: selected.concat([toggledDie])
    });
  }

  submitRoll(visibility: RollVisibility): void {
    const { dice, selected, roomId, playerName } = this.state;

    if (this.multiplayerClient && roomId) {
      this.multiplayerClient.requestRoll(createLocalRollRequest({
        dice,
        selected,
        roomId,
        rollerName: normalizePlayerName(playerName),
        visibility
      }));

      return;
    }

    this.setState(rollDiceLocally({
      dice,
      selected
    }));
  }

  roll(): void {
    this.submitRoll("public");
  }

  rollHidden(): void {
    if (!this.state.isGm) {
      return;
    }

    this.submitRoll("gm_hidden");
  }

  renderRoomStatus(): React.ReactNode {
    const {
      roomId,
      multiplayerStatus,
      roomPlayerCount,
      players,
      playerName,
      isGm,
      roomGmName,
      lastRollerName,
      lastRollVisibility
    } = this.state;

    if (!roomId) {
      return null;
    }

    const statusLabel = {
      local: "Local",
      connecting: "Connecting",
      connected: "Connected",
      disconnected: "Disconnected"
    }[multiplayerStatus];

    return <div className="room-status">
      <div className="room-status__topline">
        <span className="room-status__item">Room: {roomId}</span>
        <span className="room-status__item">Status: {statusLabel}</span>
        <span className="room-status__item">
          Players: {roomPlayerCount === null ? "—" : roomPlayerCount}
        </span>
        <span className="room-status__item">
          GM: {roomGmName || "—"}
        </span>
        {lastRollerName &&
          <span className="room-status__item">
            Last roll: {lastRollerName}
            {lastRollVisibility === "gm_hidden" ? " (hidden)" : ""}
          </span>}
      </div>

      <div className="room-status__controls">
        <label className="room-status__name">
          Nick:
          <input
            maxLength={32}
            value={playerName}
            onChange={this.handlePlayerNameChange}
          />
        </label>

        <label className="room-status__gm-toggle">
          <input
            type="checkbox"
            checked={isGm}
            onChange={this.handleGmChange}
          />
          GM
        </label>
      </div>

      <div className="room-status__players">
        <span>Connected:</span>
        {players.length
          ? players.map(player =>
            <span
              className={`room-status__player ${player.isGm ? "room-status__player--gm" : ""}`}
              key={player.id}
            >
              {player.name}{player.isGm ? " (GM)" : ""}
            </span>)
          : <span className="room-status__player">—</span>}
      </div>

      {isGm &&
        <div className="room-status__gm-note">
          Hidden rolls are visible only to you.
        </div>}
    </div>;
  }

  render() {
    return <div className="dice-area">
      {this.renderRoomStatus()}

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

        {this.state.roomId && this.state.isGm &&
          <button id="hidden-roll" onClick={this.rollHidden}>
            {this.state.selected.length ? "Hidden Re-roll Selected" : "Hidden Roll"}
          </button>}

        <button id="clear" onClick={this.clearDice}>
          {this.state.selected.length ? "Remove Selected" : "Clear"}
        </button>
      </div>
    </div>;
  }
}