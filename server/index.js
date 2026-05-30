const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const RoomManager = require("./room-manager");
const { executeRollRequest } = require("./dice-engine");

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const httpServer = http.createServer(app);
const roomManager = new RoomManager();

const socketRollState = new Map();
const roomRollState = new Map();

const io = new Server(httpServer, {
  path: "/socket.io",
  serveClient: false,
  cors: {
    origin: true,
    credentials: false
  }
});

const distPath = path.resolve(__dirname, "..", "dist");

app.disable("x-powered-by");

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "genesys-dice-roller",
    mode: "server",
    uptime: process.uptime(),
    rooms: roomManager.getStats()
  });
});

app.use(express.static(distPath));

app.get("/", (req, res) => {
  res.redirect("/genesys");
});

app.get("/genesys", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.get("/genesys/", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.get("/room/:roomId", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.get("/genesys/room/:roomId", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

function getRoomIdFromPayload(payload) {
  if (!payload || typeof payload.roomId !== "string" || !payload.roomId.trim()) {
    return null;
  }

  return payload.roomId.trim();
}

function getPreviousResultsForRoll(socket, payload) {
  const roomId = getRoomIdFromPayload(payload);

  if (roomId && payload.visibility === "public") {
    const roomState = roomRollState.get(roomId);

    return roomState ? roomState.results : null;
  }

  const socketState = socketRollState.get(socket.id);

  return socketState ? socketState.results : null;
}

function saveRollState(socket, rollResult) {
  socketRollState.set(socket.id, {
    roomId: rollResult.roomId,
    pool: rollResult.pool,
    results: rollResult.results,
    updatedAt: Date.now()
  });

  if (rollResult.roomId && rollResult.visibility === "public") {
    roomRollState.set(rollResult.roomId, {
      roomId: rollResult.roomId,
      pool: rollResult.pool,
      results: rollResult.results,
      updatedAt: Date.now()
    });
  }
}

function createAuthoritativeRollPayload(socket, payload) {
  const roomId = getRoomIdFromPayload(payload);
  const player = roomId ? roomManager.getPlayer(roomId, socket.id) : null;

  return {
    ...payload,
    roomId,
    rollerId: socket.id,
    rollerName: player ? player.name : "Player"
  };
}

io.on("connection", socket => {
  socket.emit("server_hello", {
    socketId: socket.id,
    connectedAt: Date.now()
  });

  socket.on("room_join", payload => {
    if (!payload || typeof payload.roomId !== "string" || !payload.roomId.trim()) {
      socket.emit("room_error", {
        code: "INVALID_ROOM_ID",
        message: "roomId must be a non-empty string"
      });

      return;
    }

    const roomId = payload.roomId.trim();

    socket.join(roomId);

    const snapshot = roomManager.joinRoom(
      roomId,
      socket.id,
      payload.playerName,
      payload.isGm
    );

    io.to(roomId).emit("room_state", snapshot);
    socket.emit("room_joined", snapshot);
  });

  socket.on("room_player_update", payload => {
    const roomId = getRoomIdFromPayload(payload);

    if (!roomId || !socket.rooms.has(roomId)) {
      socket.emit("room_error", {
        code: "ROOM_NOT_JOINED",
        message: "socket must join the room before updating player info"
      });

      return;
    }

    const snapshot = roomManager.updatePlayer(
      roomId,
      socket.id,
      payload.playerName,
      payload.isGm
    );

    if (snapshot) {
      io.to(roomId).emit("room_state", snapshot);
    }
  });

  socket.on("room_leave", payload => {
    if (!payload || typeof payload.roomId !== "string" || !payload.roomId.trim()) {
      return;
    }

    const roomId = payload.roomId.trim();

    socket.leave(roomId);

    const snapshot = roomManager.leaveRoom(roomId, socket.id);

    socket.emit("room_left", {
      roomId
    });

    if (snapshot) {
      io.to(roomId).emit("room_state", snapshot);
    } else {
      roomRollState.delete(roomId);
    }
  });

  socket.on("roll_request", payload => {
    const roomId = getRoomIdFromPayload(payload);

    if (roomId && !socket.rooms.has(roomId)) {
      socket.emit("roll_error", {
        code: "ROOM_NOT_JOINED",
        message: "socket must join the room before rolling"
      });

      return;
    }

    if (payload && payload.visibility === "gm_hidden") {
      if (!roomId) {
        socket.emit("roll_error", {
          code: "ROOM_REQUIRED_FOR_HIDDEN_ROLL",
          message: "hidden rolls are only available in rooms"
        });

        return;
      }

      if (!roomManager.isRoomGm(roomId, socket.id)) {
        socket.emit("roll_error", {
          code: "NOT_GM",
          message: "only GM players can make hidden rolls"
        });

        return;
      }
    }

    const authoritativePayload = createAuthoritativeRollPayload(socket, payload);
    const previousResults = getPreviousResultsForRoll(socket, authoritativePayload);
    const execution = executeRollRequest(authoritativePayload, previousResults);

    if (!execution.ok) {
      socket.emit("roll_error", {
        code: "INVALID_ROLL_REQUEST",
        errors: execution.errors
      });

      return;
    }

    const rollResult = execution.result;

    saveRollState(socket, rollResult);

    if (rollResult.visibility === "gm_hidden") {
      socket.emit("roll_result", rollResult);
      return;
    }

    if (rollResult.roomId) {
      io.to(rollResult.roomId).emit("roll_result", rollResult);
      return;
    }

    socket.emit("roll_result", rollResult);
  });

  socket.on("disconnect", () => {
    socketRollState.delete(socket.id);

    const changedRooms = roomManager.removeSocket(socket.id);

    changedRooms.forEach(change => {
      if (change.snapshot) {
        io.to(change.roomId).emit("room_state", change.snapshot);
      } else {
        roomRollState.delete(change.roomId);
      }
    });
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Genesys Dice Roller server listening on http://${HOST}:${PORT}`);
});