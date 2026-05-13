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
        sockets: new Set(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return this.rooms.get(roomId);
  }

  joinRoom(roomId, socketId) {
    const room = this.ensureRoom(roomId);

    room.sockets.add(socketId);
    room.updatedAt = Date.now();

    return this.getRoomSnapshot(roomId);
  }

  leaveRoom(roomId, socketId) {
    const room = this.rooms.get(roomId);

    if (!room) {
      return null;
    }

    room.sockets.delete(socketId);
    room.updatedAt = Date.now();

    if (room.sockets.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    return this.getRoomSnapshot(roomId);
  }

  removeSocket(socketId) {
    const changedRooms = [];

    for (const roomId of this.rooms.keys()) {
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

    return {
      id: room.id,
      playerCount: room.sockets.size,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };
  }

  getStats() {
    let socketCount = 0;

    for (const room of this.rooms.values()) {
      socketCount += room.sockets.size;
    }

    return {
      roomCount: this.rooms.size,
      socketCount
    };
  }
}

module.exports = RoomManager;