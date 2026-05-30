function normalizePlayerName(playerName) {
  if (typeof playerName !== "string") {
    return "Player";
  }

  const trimmed = playerName.trim();

  if (!trimmed) {
    return "Player";
  }

  return trimmed.slice(0, 32);
}

function normalizeIsGm(isGm) {
  return isGm === true;
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  ensureRoom(roomId) {
    if (!roomId || typeof roomId !== "string") {
      throw new Error("roomId must be a non-empty string");
    }

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        players: new Map(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return this.rooms.get(roomId);
  }

    getCurrentGm(room) {
    for (const player of room.players.values()) {
      if (player.isGm) {
        return player;
      }
    }

    return null;
  }

  setGmIfAvailable(room, socketId) {
    const player = room.players.get(socketId);

    if (!player) {
      return false;
    }

    const currentGm = this.getCurrentGm(room);

    if (currentGm && currentGm.id !== socketId) {
      return false;
    }

    const now = Date.now();

    for (const roomPlayer of room.players.values()) {
      const shouldBeGm = roomPlayer.id === socketId;

      if (roomPlayer.isGm !== shouldBeGm) {
        roomPlayer.isGm = shouldBeGm;
        roomPlayer.updatedAt = now;
      }
    }

    room.updatedAt = now;

    return true;
  }

  clearGmIfCurrent(room, socketId) {
    const player = room.players.get(socketId);

    if (!player || !player.isGm) {
      return;
    }

    player.isGm = false;
    player.updatedAt = Date.now();
    room.updatedAt = Date.now();
  }

  joinRoom(roomId, socketId, playerName, isGm) {
    const room = this.ensureRoom(roomId);
    const now = Date.now();

    room.players.set(socketId, {
      id: socketId,
      name: normalizePlayerName(playerName),
      isGm: false,
      joinedAt: now,
      updatedAt: now
    });

    if (normalizeIsGm(isGm)) {
      if (!this.setGmIfAvailable(room, socketId)) {
        room.updatedAt = now;
      }
    } else {
      room.updatedAt = now;
    }

    return this.getRoomSnapshot(roomId);
  }

  updatePlayer(roomId, socketId, playerName, isGm) {
    const room = this.rooms.get(roomId);

    if (!room || !room.players.has(socketId)) {
      return null;
    }

    const player = room.players.get(socketId);

    player.name = normalizePlayerName(playerName);
    player.updatedAt = Date.now();

    if (normalizeIsGm(isGm)) {
      this.setGmIfAvailable(room, socketId);
    } else {
      this.clearGmIfCurrent(room, socketId);
    }

    room.updatedAt = Date.now();

    return this.getRoomSnapshot(roomId);
  }

  getPlayer(roomId, socketId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    return room.players.get(socketId) || null;
  }

  isRoomGm(roomId, socketId) {
    const player = this.getPlayer(roomId, socketId);

    return Boolean(player && player.isGm);
  }

  leaveRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    room.players.delete(socketId);
    room.updatedAt = Date.now();

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return this.getRoomSnapshot(roomId);
  }

  removeSocket(socketId) {
    const changedRooms = [];

    for (const roomId of Array.from(this.rooms.keys())) {
      const snapshot = this.leaveRoom(roomId, socketId);

      changedRooms.push({
        roomId,
        snapshot
      });
    }

    return changedRooms;
  }

  getRoomSnapshot(roomId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    const players = Array.from(room.players.values())
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map(player => ({
        id: player.id,
        name: player.name,
        isGm: player.isGm,
        role: player.isGm ? "gm" : "player",
        joinedAt: player.joinedAt,
        updatedAt: player.updatedAt
      }));

    const gmPlayer = players.find(player => player.isGm) || null;

    return {
      id: room.id,
      playerCount: players.length,
      gmId: gmPlayer ? gmPlayer.id : null,
      gmName: gmPlayer ? gmPlayer.name : null,
      players,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };
  }

  getStats() {
    let socketCount = 0;

    for (const room of this.rooms.values()) {
      socketCount += room.players.size;
    }

    return {
      roomCount: this.rooms.size,
      socketCount
    };
  }
}

module.exports = RoomManager;