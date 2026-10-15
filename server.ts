import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  GameMode,
  MapId,
  NetworkPlayer,
  PlayerCustomization,
  PlayerPhysicsState,
  RoomState,
  ServerToClientEvents,
} from './src/types/game';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

// Rooms State Memory
const rooms = new Map<string, RoomState>();

// Helper to generate funny memorable room codes
function generateRoomCode(): string {
  const prefixes = ['TOOT', 'POOF', 'BOOP', 'GAS', 'BEAN', 'PUFF'];
  const num = Math.floor(10 + Math.random() * 90);
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}-${num}`;
}

async function startServer() {
  await nextApp.prepare();

  const httpServer = createServer(async (req, res) => {
    // Intercept /api/rooms to return active multiplayer rooms memory
    if (req.url === '/api/rooms') {
      const publicRooms: Array<{
        code: string;
        name: string;
        playerCount: number;
        maxPlayers: number;
        mapId: MapId;
        mode: GameMode;
        status: string;
      }> = [];

      rooms.forEach((room) => {
        if (!room.isPrivate) {
          publicRooms.push({
            code: room.code,
            name: room.name,
            playerCount: Object.keys(room.players).length,
            maxPlayers: room.maxPlayers,
            mapId: room.mapId,
            mode: room.mode,
            status: room.status,
          });
        }
      });

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(publicRooms));
      return;
    }

    try {
      await handle(req, res);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
    },
    pingInterval: 5000,
    pingTimeout: 4000,
  });

  // Socket.IO Handling
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentRoomCode: string | null = null;
    let playerId = socket.id;

    // Latency ping
    socket.on('ping:latency', (ts) => {
      socket.emit('pong:latency', ts);
    });

    // Create Room
    socket.on('room:create', ({ name, isPrivate, maxPlayers, mode, mapId, customization }, callback) => {
      const code = generateRoomCode();
      const player: NetworkPlayer = {
        id: playerId,
        name: customization.name || `Buddy-${playerId.slice(0, 4)}`,
        isHost: true,
        isReady: true,
        customization,
        state: {
          id: playerId,
          position: [0, 1.5, 0],
          velocity: [0, 0, 0],
          rotation: 0,
          isGrounded: true,
          isRagdoll: false,
          ragdollTimer: 0,
          emote: null,
          fartCooldown: 0,
          holdingObjectId: null,
          score: 0,
          checkpoint: 0,
          hasFinished: false,
        },
        ping: 25,
      };

      const room: RoomState = {
        code,
        name: name || `${player.name}'s Party`,
        hostId: playerId,
        isPrivate,
        status: 'lobby',
        maxPlayers: Math.max(2, Math.min(8, maxPlayers)),
        mode: mode || 'coop-obby',
        mapId: mapId || 'floating-islands',
        players: { [playerId]: player },
        objects: {},
        elapsedTime: 0,
        targetScore: 100,
      };

      rooms.set(code, room);
      currentRoomCode = code;
      socket.join(code);

      callback({ success: true, code });
      socket.emit('room:state', room);
    });

    // Join Room
    socket.on('room:join', ({ code, customization }, callback) => {
      const cleanCode = code.trim().toUpperCase();
      const room = rooms.get(cleanCode);

      if (!room) {
        callback({ success: false, error: 'Room not found! Check code and try again.' });
        return;
      }

      const currentCount = Object.keys(room.players).length;
      if (currentCount >= room.maxPlayers) {
        callback({ success: false, error: 'Room is already full!' });
        return;
      }

      const player: NetworkPlayer = {
        id: playerId,
        name: customization.name || `Buddy-${playerId.slice(0, 4)}`,
        isHost: false,
        isReady: false,
        customization,
        state: {
          id: playerId,
          position: [0, 1.5, 0],
          velocity: [0, 0, 0],
          rotation: 0,
          isGrounded: true,
          isRagdoll: false,
          ragdollTimer: 0,
          emote: null,
          fartCooldown: 0,
          holdingObjectId: null,
          score: 0,
          checkpoint: 0,
          hasFinished: false,
        },
        ping: 30,
      };

      room.players[playerId] = player;
      currentRoomCode = cleanCode;
      socket.join(cleanCode);

      callback({ success: true, room });
      // Broadcast to room
      io.to(cleanCode).emit('room:player-joined', player);
      io.to(cleanCode).emit('room:chat', {
        sender: 'System',
        text: `${player.name} joined the lobby! 🎉`,
        isSystem: true,
      });
    });

    // Ready Up
    socket.on('room:ready', (ready) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.players[playerId]) return;

      room.players[playerId].isReady = ready;
      io.to(currentRoomCode).emit('room:player-updated', { id: playerId, isReady: ready });
    });

    // Update Settings (Host only)
    socket.on('room:update-settings', ({ mode, mapId }) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.hostId !== playerId) return;

      if (mode) room.mode = mode;
      if (mapId) room.mapId = mapId;
      io.to(currentRoomCode).emit('room:state', room);
    });

    // Start Game (Host only)
    socket.on('room:start-game', () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || room.hostId !== playerId) return;

      room.status = 'playing';
      room.elapsedTime = 0;
      io.to(currentRoomCode).emit('game:started', { mapId: room.mapId, mode: room.mode });
      io.to(currentRoomCode).emit('room:chat', {
        sender: 'System',
        text: '🚀 The match has started! Toot together to victory!',
        isSystem: true,
      });
    });

    // Chat message
    socket.on('room:chat', (text) => {
      if (!currentRoomCode || !text.trim()) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.players[playerId]) return;

      io.to(currentRoomCode).emit('room:chat', {
        sender: room.players[playerId].name,
        text: text.slice(0, 120),
      });
    });

    // Player Customization Update
    socket.on('player:update-customization', (customization) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.players[playerId]) return;

      room.players[playerId].customization = customization;
      room.players[playerId].name = customization.name;
      io.to(currentRoomCode).emit('room:player-updated', {
        id: playerId,
        customization,
        name: customization.name,
      });
    });

    // Real-time Physics Sync
    socket.on('player:sync-physics', (state) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.players[playerId]) return;

      room.players[playerId].state = state;
      socket.to(currentRoomCode).emit('room:player-updated', {
        id: playerId,
        state,
      });
    });

    // Fart Boost Broadcast
    socket.on('player:fart-boost', (data) => {
      if (!currentRoomCode) return;
      socket.to(currentRoomCode).emit('game:player-boost', {
        playerId,
        position: data.position,
        forward: data.forward,
      });
    });

    // Emote Broadcast
    socket.on('player:trigger-emote', (emote) => {
      if (!currentRoomCode) return;
      io.to(currentRoomCode).emit('game:player-emote', {
        playerId,
        emote,
      });
    });

    // Checkpoint reached
    socket.on('player:reach-checkpoint', (checkpoint) => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room || !room.players[playerId]) return;

      room.players[playerId].state.checkpoint = checkpoint;
      io.to(currentRoomCode).emit('game:checkpoint-reached', {
        playerId,
        checkpoint,
        time: room.elapsedTime,
      });
    });

    // Disconnect Handling
    const handleLeave = () => {
      if (!currentRoomCode) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;

      const leavingPlayer = room.players[playerId];
      delete room.players[playerId];
      socket.leave(currentRoomCode);

      const remaining = Object.keys(room.players);
      if (remaining.length === 0) {
        rooms.delete(currentRoomCode);
      } else {
        if (room.hostId === playerId) {
          room.hostId = remaining[0];
          room.players[remaining[0]].isHost = true;
        }
        io.to(currentRoomCode).emit('room:player-left', playerId);
        if (leavingPlayer) {
          io.to(currentRoomCode).emit('room:chat', {
            sender: 'System',
            text: `${leavingPlayer.name} disconnected from the lobby.`,
            isSystem: true,
          });
        }
        io.to(currentRoomCode).emit('room:state', room);
      }
      currentRoomCode = null;
    };

    socket.on('room:leave', handleLeave);
    socket.on('disconnecting', handleLeave);
    socket.on('disconnect', handleLeave);
    socket.on('error', handleLeave);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`[Next.js + Socket.IO] Server ready on http://${hostname}:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error]', err);
});
