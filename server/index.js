const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const RoomManager = require("./room-manager");

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const httpServer = http.createServer(app);
const roomManager = new RoomManager();

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

  socket.on("disconnect", () => {
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