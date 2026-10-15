import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  GameMode,
  MapId,
  NetworkPlayer,
  PlayerCustomization,
  PlayerPhysicsState,
  RoomState,
  ServerToClientEvents,
} from '../types/game';

class NetworkClient {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isConnected: boolean = false;
  public ping: number = 0;
  private pingInterval: number | null = null;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.socket && this.socket.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
    this.socket = io(socketUrl, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.startPingTracker();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.stopPingTracker();
    });

    this.socket.on('pong:latency', (clientTs: number) => {
      this.ping = Math.max(1, Math.round(Date.now() - clientTs));
    });
  }

  private startPingTracker() {
    this.stopPingTracker();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping:latency', Date.now());
      }
    }, 3000);
  }

  private stopPingTracker() {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public createRoom(
    data: {
      name: string;
      isPrivate: boolean;
      maxPlayers: number;
      mode: GameMode;
      mapId: MapId;
      customization: PlayerCustomization;
    },
    callback: (res: { success: boolean; code?: string; error?: string }) => void
  ) {
    if (!this.socket) return callback({ success: false, error: 'Network socket not initialized' });
    this.socket.emit('room:create', data, callback);
  }

  public joinRoom(
    code: string,
    customization: PlayerCustomization,
    callback: (res: { success: boolean; room?: RoomState; error?: string }) => void
  ) {
    if (!this.socket) return callback({ success: false, error: 'Network socket not initialized' });
    this.socket.emit('room:join', { code, customization }, callback);
  }

  public leaveRoom() {
    this.socket?.emit('room:leave');
  }

  public setReady(ready: boolean) {
    this.socket?.emit('room:ready', ready);
  }

  public updateSettings(data: { mode?: GameMode; mapId?: MapId }) {
    this.socket?.emit('room:update-settings', data);
  }

  public startGame() {
    this.socket?.emit('room:start-game');
  }

  public sendChat(text: string) {
    this.socket?.emit('room:chat', text);
  }

  public syncPhysics(state: PlayerPhysicsState) {
    this.socket?.emit('player:sync-physics', state);
  }

  public sendFartBoost(pos: [number, number, number], forward: [number, number, number]) {
    this.socket?.emit('player:fart-boost', { position: pos, forward });
  }

  public sendEmote(emote: string) {
    this.socket?.emit('player:trigger-emote', emote);
  }

  public sendCheckpoint(cp: number) {
    this.socket?.emit('player:reach-checkpoint', cp);
  }

  public updateCustomization(c: PlayerCustomization) {
    this.socket?.emit('player:update-customization', c);
  }
}

export const networkClient = new NetworkClient();
