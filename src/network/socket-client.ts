import { io } from "socket.io-client";

import { RollRequest, RollResult } from "src/model/roll-contracts";

type SocketInstance = ReturnType<typeof io>;

export type PlayerSnapshot = {
  id: string;
  name: string;
  joinedAt: number;
  updatedAt: number;
};

export type RoomSnapshot = {
  id: string;
  playerCount: number;
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
  updatePlayerName(playerName: string): void;
  requestRoll(request: RollRequest): void;
  disconnect(): void;
};

export function getRoomIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/room\/([^/]+)\/?$/);

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
  handlers: MultiplayerSocketHandlers = {}
): MultiplayerSocketClient {
  const normalizedRoomId = roomId.trim();

  if (!normalizedRoomId) {
    throw new Error("roomId must be a non-empty string");
  }

  let joined = false;
  let currentPlayerName = normalizePlayerName(playerName);
  const pendingRollRequests: RollRequest[] = [];

  const socket: SocketInstance = io({
    path: "/socket.io",
    transports: ["websocket", "polling"]
  });

  function emitRoomJoin(): void {
    socket.emit("room_join", {
      roomId: normalizedRoomId,
      playerName: currentPlayerName
    });
  }

  function emitPlayerUpdate(): void {
    if (!joined) {
      return;
    }

    socket.emit("room_player_update", {
      roomId: normalizedRoomId,
      playerName: currentPlayerName
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

    updatePlayerName(playerNameToSet: string): void {
      currentPlayerName = normalizePlayerName(playerNameToSet);
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