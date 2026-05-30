import { io } from "socket.io-client";

import { RollRequest, RollResult } from "src/model/roll-contracts";

type SocketInstance = ReturnType<typeof io>;

export type PlayerRole = "gm" | "player";

export type PlayerSnapshot = {
  id: string;
  name: string;
  isGm: boolean;
  role: PlayerRole;
  joinedAt: number;
  updatedAt: number;
};

export type RoomSnapshot = {
  id: string;
  playerCount: number;
  gmId: string | null;
  gmName: string | null;
  players: PlayerSnapshot[];
  createdAt: number;
  updatedAt: number;
};

export type ServerHello = {
  socketId: string;
  connectedAt: number;
};

export type SocketErrorPayload = {
  code: string;
  message?: string;
  errors?: string[];
};

export type MultiplayerSocketHandlers = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onServerHello?: (payload: ServerHello) => void;
  onRoomJoined?: (snapshot: RoomSnapshot) => void;
  onRoomState?: (snapshot: RoomSnapshot) => void;
  onRollResult?: (result: RollResult) => void;
  onRoomError?: (error: SocketErrorPayload) => void;
  onRollError?: (error: SocketErrorPayload) => void;
};

export type MultiplayerSocketClient = {
  getRoomId(): string;
  isConnected(): boolean;
  isJoined(): boolean;
  updatePlayer(playerName: string, isGm: boolean): void;
  requestRoll(request: RollRequest): void;
  disconnect(): void;
};

const DEFAULT_ROOM_ID = "main";

export function getRoomIdFromPath(pathname: string): string | null {
  if (pathname === "/genesys" || pathname === "/genesys/") {
    return DEFAULT_ROOM_ID;
  }

  const match = pathname.match(/^(?:\/genesys)?\/room\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function normalizePlayerName(playerName: string): string {
  const trimmed = playerName.trim();

  if (!trimmed) {
    return "Player";
  }

  return trimmed.slice(0, 32);
}

export function createMultiplayerSocketClient(
  roomId: string,
  playerName: string,
  isGm: boolean,
  handlers: MultiplayerSocketHandlers = {}
): MultiplayerSocketClient {
  const normalizedRoomId = roomId.trim();

  if (!normalizedRoomId) {
    throw new Error("roomId must be a non-empty string");
  }

  let joined = false;
  let currentPlayerName = normalizePlayerName(playerName);
  let currentIsGm = isGm === true;
  const pendingRollRequests: RollRequest[] = [];

  const socket: SocketInstance = io({
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });

  function emitRoomJoin(): void {
    socket.emit("room_join", {
      roomId: normalizedRoomId,
      playerName: currentPlayerName,
      isGm: currentIsGm
    });
  }

  function emitPlayerUpdate(): void {
    if (!joined) {
      return;
    }

    socket.emit("room_player_update", {
      roomId: normalizedRoomId,
      playerName: currentPlayerName,
      isGm: currentIsGm
    });
  }

  function emitRollRequest(request: RollRequest): void {
    socket.emit("roll_request", {
      ...request,
      roomId: normalizedRoomId,
      rollerName: currentPlayerName
    });
  }

  function flushPendingRollRequests(): void {
    while (pendingRollRequests.length) {
      const request = pendingRollRequests.shift();

      if (request) {
        emitRollRequest(request);
      }
    }
  }

  socket.on("connect", () => {
    handlers.onConnect?.();
    emitRoomJoin();
  });

  socket.on("disconnect", () => {
    joined = false;
    handlers.onDisconnect?.();
  });

  socket.on("server_hello", (payload: ServerHello) => {
    handlers.onServerHello?.(payload);
  });

  socket.on("room_joined", (snapshot: RoomSnapshot) => {
    joined = true;

    handlers.onRoomJoined?.(snapshot);
    flushPendingRollRequests();
  });

  socket.on("room_state", (snapshot: RoomSnapshot) => {
    handlers.onRoomState?.(snapshot);
  });

  socket.on("room_error", (error: SocketErrorPayload) => {
    handlers.onRoomError?.(error);
  });

  socket.on("roll_result", (result: RollResult) => {
    handlers.onRollResult?.(result);
  });

  socket.on("roll_error", (error: SocketErrorPayload) => {
    handlers.onRollError?.(error);
  });

  return {
    getRoomId(): string {
      return normalizedRoomId;
    },

    isConnected(): boolean {
      return socket.connected;
    },

    isJoined(): boolean {
      return joined;
    },

    updatePlayer(playerNameToSet: string, isGmToSet: boolean): void {
      currentPlayerName = normalizePlayerName(playerNameToSet);
      currentIsGm = isGmToSet === true;
      emitPlayerUpdate();
    },

    requestRoll(request: RollRequest): void {
      if (!joined) {
        pendingRollRequests.push(request);
        return;
      }

      emitRollRequest(request);
    },

    disconnect(): void {
      pendingRollRequests.length = 0;

      if (joined) {
        socket.emit("room_leave", {
          roomId: normalizedRoomId
        });
      }

      socket.disconnect();
    }
  };
}