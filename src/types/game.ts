export type GameMode = 
  | 'coop-obby' 
  | 'physics-playground' 
  | 'team-challenges' 
  | 'last-player' 
  | 'time-trial';

export type MapId = 'floating-islands' | string;

export interface AccessoryOption {
  id: string;
  name: string;
  type: 'hat' | 'glasses' | 'item';
  meshType: 'propeller' | 'chef' | 'party' | 'horns' | 'plunger' | 'sunglasses' | 'halo' | 'none';
}

export interface PlayerCustomization {
  name: string;
  color: string;
  secondaryColor: string;
  accessory: string;
  faceExpression: 'happy' | 'silly' | 'shocked' | 'cool' | 'dizzy';
}

export interface PlayerInput {
  forward: number;
  sideways: number;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  fartBoost: boolean;
  interact: boolean;
  camYaw: number;
  camPitch: number;
}

export interface PlayerPhysicsState {
  id: string;
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: number; // yaw in radians
  isGrounded: boolean;
  isRagdoll: boolean;
  ragdollTimer: number;
  emote: string | null;
  fartCooldown: number;
  holdingObjectId: string | null;
  score: number;
  checkpoint: number;
  hasFinished: boolean;
}

export interface NetworkPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  customization: PlayerCustomization;
  state: PlayerPhysicsState;
  ping: number;
}

export interface InteractiveObjectState {
  id: string;
  type: 'box' | 'ball' | 'barrel' | 'button' | 'moving-platform' | 'trampoline' | 'door';
  position: [number, number, number];
  rotation: [number, number, number];
  heldBy?: string | null;
  active?: boolean;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  isPrivate: boolean;
  status: 'lobby' | 'playing' | 'ended';
  maxPlayers: number;
  mode: GameMode;
  mapId: MapId;
  players: Record<string, NetworkPlayer>;
  objects: Record<string, InteractiveObjectState>;
  elapsedTime: number;
  targetScore: number;
  winnerTeam?: string | null;
}

export interface ServerToClientEvents {
  'room:state': (room: RoomState) => void;
  'room:player-joined': (player: NetworkPlayer) => void;
  'room:player-left': (playerId: string) => void;
  'room:player-updated': (player: Partial<NetworkPlayer> & { id: string }) => void;
  'room:chat': (data: { sender: string; text: string; isSystem?: boolean }) => void;
  'game:started': (data: { mapId: MapId; mode: GameMode }) => void;
  'game:player-boost': (data: { playerId: string; position: [number, number, number]; forward: [number, number, number] }) => void;
  'game:player-emote': (data: { playerId: string; emote: string }) => void;
  'game:object-sync': (objects: Record<string, InteractiveObjectState>) => void;
  'game:checkpoint-reached': (data: { playerId: string; checkpoint: number; time: number }) => void;
  'game:completed': (data: { winnerId: string; winnerName: string; time: number }) => void;
  'game:reset-round': () => void;
  'pong:latency': (timestamp: number) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { name: string; isPrivate: boolean; maxPlayers: number; mode: GameMode; mapId: MapId; customization: PlayerCustomization }, callback: (res: { success: boolean; code?: string; error?: string }) => void) => void;
  'room:join': (data: { code: string; customization: PlayerCustomization }, callback: (res: { success: boolean; room?: RoomState; error?: string }) => void) => void;
  'room:leave': () => void;
  'room:ready': (ready: boolean) => void;
  'room:update-settings': (data: { mode?: GameMode; mapId?: MapId }) => void;
  'room:start-game': () => void;
  'room:chat': (text: string) => void;
  'player:update-customization': (customization: PlayerCustomization) => void;
  'player:sync-physics': (state: PlayerPhysicsState) => void;
  'player:fart-boost': (data: { position: [number, number, number]; forward: [number, number, number] }) => void;
  'player:trigger-emote': (emote: string) => void;
  'player:interact': (data: { objectId: string; action: 'grab' | 'release' | 'throw' | 'press' }) => void;
  'player:reach-checkpoint': (checkpoint: number) => void;
  'ping:latency': (timestamp: number) => void;
}

export interface MapMetadata {
  id: MapId;
  name: string;
  theme: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Chaotic';
  previewColor: string;
  features: string[];
}
