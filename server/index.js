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
  res.sendFile(path.join(distPath, "index.html"));
});

app.get("/room/:roomId", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

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

    const snapshot = roomManager.joinRoom(roomId, socket.id);

    socket.emit("room_joined", snapshot);
    socket.to(roomId).emit("room_state", snapshot);
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
      socket.to(roomId).emit("room_state", snapshot);
    }
  });

  socket.on("roll_request", payload => {
    const previousState = socketRollState.get(socket.id);
    const execution = executeRollRequest(
      payload,
      previousState ? previousState.results : null
    );

    if (!execution.ok) {
      socket.emit("roll_error", {
        code: "INVALID_ROLL_REQUEST",
        errors: execution.errors
      });

      return;
    }

    const rollResult = execution.result;

    if (rollResult.roomId && !socket.rooms.has(rollResult.roomId)) {
      socket.emit("roll_error", {
        code: "ROOM_NOT_JOINED",
        message: "socket must join the room before rolling"
      });

      return;
    }

    socketRollState.set(socket.id, {
      roomId: rollResult.roomId,
      results: rollResult.results,
      updatedAt: Date.now()
    });

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
        socket.to(change.roomId).emit("room_state", change.snapshot);
      }
    });
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Genesys Dice Roller server listening on http://${HOST}:${PORT}`);
});