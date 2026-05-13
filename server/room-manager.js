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

  joinRoom(roomId, socketId, playerName) {
    const room = this.ensureRoom(roomId);
    const now = Date.now();

    room.players.set(socketId, {
      id: socketId,
      name: normalizePlayerName(playerName),
      joinedAt: now,
      updatedAt: now
    });

    room.updatedAt = now;

    return this.getRoomSnapshot(roomId);
  }

  updatePlayerName(roomId, socketId, playerName) {
    const room = this.rooms.get(roomId);

    if (!room || !room.players.has(socketId)) {
      return null;
    }

    const player = room.players.get(socketId);

    player.name = normalizePlayerName(playerName);
    player.updatedAt = Date.now();
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
        joinedAt: player.joinedAt,
        updatedAt: player.updatedAt
      }));

    return {
      id: room.id,
      playerCount: players.length,
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