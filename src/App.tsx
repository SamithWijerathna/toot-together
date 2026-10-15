'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GameMode, MapId, NetworkPlayer, PlayerCustomization, PlayerPhysicsState, RoomState } from './types/game';
import { networkClient } from './network/clientSocket';
import { soundManager } from './audio/SoundManager';
import { GameEngine } from './game/GameEngine';
import { LandingMenu } from './components/menus/LandingMenu';
import { LobbyRoom } from './components/lobby/LobbyRoom';
import { GameHUD } from './components/hud/GameHUD';
import { MobileControls } from './components/hud/MobileControls';
import { PauseMenu } from './components/hud/PauseMenu';
import { VictoryModal } from './components/hud/VictoryModal';
import { CharacterCustomizer } from './components/menus/CharacterCustomizer';
import { RoomBrowserModal } from './components/menus/RoomBrowserModal';
import { HowToPlayModal } from './components/menus/HowToPlayModal';
import { SettingsModal } from './components/menus/SettingsModal';
import { WifiOff, X } from 'lucide-react';

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  name: `Buddy-${Math.floor(100 + Math.random() * 900)}`,
  color: '#84cc16', // Toxic Lime
  secondaryColor: '#fef08a', // Cream
  accessory: 'propeller',
  faceExpression: 'happy',
};

const MAP_SEQUENCE: MapId[] = [
  'floating-islands',
  'fall-guys-run',
];

export default function App() {
  // Screen state
  const [screen, setScreen] = useState<'landing' | 'lobby' | 'playing'>('landing');

  // Customization
  const [customization, setCustomization] = useState<PlayerCustomization>(() => {
    const saved = localStorage.getItem('toot_customization');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_CUSTOMIZATION;
  });

  // Touch & Mobile detection
  const [touchMode, setTouchMode] = useState<'auto' | 'on' | 'off'>(() => {
    return (localStorage.getItem('toot_touch_mode') as 'auto' | 'on' | 'off') || 'auto';
  });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth < 1024;
      setIsTouchDevice(hasTouch);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    const onTouch = () => setIsTouchDevice(true);
    window.addEventListener('touchstart', onTouch, { once: true });
    return () => {
      window.removeEventListener('resize', checkTouch);
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);

  const handleTouchModeChange = (mode: 'auto' | 'on' | 'off') => {
    setTouchMode(mode);
    localStorage.setItem('toot_touch_mode', mode);
  };

  // Invert mouse camera control
  const [invertMouse, setInvertMouse] = useState<boolean>(() => {
    return localStorage.getItem('toot_invert_mouse') === 'true';
  });

  const handleInvertMouseChange = (invert: boolean) => {
    setInvertMouse(invert);
    localStorage.setItem('toot_invert_mouse', String(invert));
    if (gameEngineRef.current) {
      gameEngineRef.current.setInvertMouse(invert);
    }
  };

  const showMobileControls = touchMode === 'on' || (touchMode === 'auto' && isTouchDevice);

  // Modals
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPause, setShowPause] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  // Room State
  const [currentRoom, setCurrentRoom] = useState<RoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; isSystem?: boolean }>>([]);
  const [completionTime, setCompletionTime] = useState(0);
  const [disconnectNotice, setDisconnectNotice] = useState<string | null>(null);

  // Active game map & mode
  const [activeMapId, setActiveMapId] = useState<MapId>('floating-islands');
  const [activeMode, setActiveMode] = useState<GameMode>('coop-obby');

  // Local physics & performance tracking
  const [localState, setLocalState] = useState<PlayerPhysicsState>({
    id: 'local',
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
  });

  const [fps, setFps] = useState(60);
  const [ping, setPing] = useState(25);

  // References for 3D Game Engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uiOverlayRef = useRef<HTMLDivElement | null>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const matchTimerRef = useRef<number | null>(null);
  const matchStartTimeRef = useRef<number>(0);

  // Save customization changes
  const handleCustomizationChange = (c: PlayerCustomization) => {
    setCustomization(c);
    localStorage.setItem('toot_customization', JSON.stringify(c));
    if (gameEngineRef.current) {
      gameEngineRef.current.updateLocalCustomization(c);
    }
    if (currentRoom) {
      networkClient.updateCustomization(c);
    }
  };

  // Socket.IO event listeners
  useEffect(() => {
    const socket = networkClient.socket;
    if (!socket) return;

    const handleRoomState = (room: RoomState) => {
      setCurrentRoom(room);
      setActiveMapId(room.mapId);
      setActiveMode(room.mode);
      if (room.status === 'playing' && screen !== 'playing') {
        startGameSession(room.mapId, room.mode);
      }
    };

    const handlePlayerJoined = (player: NetworkPlayer) => {
      soundManager.playCheckpoint();
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: { ...prev.players, [player.id]: player },
        };
      });
      if (gameEngineRef.current) {
        gameEngineRef.current.syncRemotePlayer(player);
      }
    };

    const handlePlayerLeft = (playerId: string) => {
      setCurrentRoom((prev) => {
        if (!prev) return prev;
        const nextPlayers = { ...prev.players };
        delete nextPlayers[playerId];
        return { ...prev, players: nextPlayers };
      });
      if (gameEngineRef.current) {
        gameEngineRef.current.removeRemotePlayer(playerId);
      }
    };

    const handlePlayerUpdated = (player: Partial<NetworkPlayer> & { id: string }) => {
      setCurrentRoom((prev) => {
        if (!prev || !prev.players[player.id]) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [player.id]: {
              ...prev.players[player.id],
              ...player,
            },
          },
        };
      });

      if (gameEngineRef.current && player.id !== networkClient.socket?.id) {
        const fullPlayer = currentRoom?.players[player.id];
        if (fullPlayer) {
          gameEngineRef.current.syncRemotePlayer({
            ...fullPlayer,
            ...player,
          });
        }
      }
    };

    const handleChat = (msg: { sender: string; text: string; isSystem?: boolean }) => {
      soundManager.playClick();
      setChatMessages((prev) => [...prev.slice(-30), msg]);
    };

    const handleGameStarted = (data: { mapId: MapId; mode: GameMode }) => {
      startGameSession(data.mapId, data.mode);
    };

    const handleRemoteBoost = (data: { playerId: string; position: [number, number, number]; forward: [number, number, number] }) => {
      if (gameEngineRef.current) {
        gameEngineRef.current.handleRemoteFartBoost(data.playerId, data.position, data.forward);
      }
    };

    const handleRemoteEmote = (data: { playerId: string; emote: string }) => {
      soundManager.playBounce();
      if (gameEngineRef.current) {
        const remote = gameEngineRef.current.remotePlayers.get(data.playerId);
        if (remote) remote.emote = data.emote;
      }
    };

    const handleDisconnect = () => {
      if (screen === 'lobby' || screen === 'playing') {
        soundManager.stopMusic();
        document.exitPointerLock?.();
        if (gameEngineRef.current) {
          gameEngineRef.current.dispose();
          gameEngineRef.current = null;
        }
        setCurrentRoom(null);
        setScreen('landing');
        setDisconnectNotice('Disconnected from the lobby due to a network interruption. Please check your connection and rejoin or create a new room.');
      }
    };

    const handleReconnect = () => {
      if (screen === 'lobby' || screen === 'playing') {
        soundManager.stopMusic();
        document.exitPointerLock?.();
        if (gameEngineRef.current) {
          gameEngineRef.current.dispose();
          gameEngineRef.current = null;
        }
        setCurrentRoom(null);
        setScreen('landing');
        setDisconnectNotice('Network reconnected! You were returned to the main menu.');
      }
    };

    const handleOffline = () => {
      if (screen === 'lobby' || screen === 'playing') {
        soundManager.stopMusic();
        document.exitPointerLock?.();
        if (gameEngineRef.current) {
          gameEngineRef.current.dispose();
          gameEngineRef.current = null;
        }
        setCurrentRoom(null);
        setScreen('landing');
        setDisconnectNotice('Your internet connection went offline. Disconnected from the lobby.');
      }
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:player-joined', handlePlayerJoined);
    socket.on('room:player-left', handlePlayerLeft);
    socket.on('room:player-updated', handlePlayerUpdated);
    socket.on('room:chat', handleChat);
    socket.on('game:started', handleGameStarted);
    socket.on('game:player-boost', handleRemoteBoost);
    socket.on('game:player-emote', handleRemoteEmote);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect', handleReconnect);
    window.addEventListener('offline', handleOffline);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('room:player-joined', handlePlayerJoined);
      socket.off('room:player-left', handlePlayerLeft);
      socket.off('room:player-updated', handlePlayerUpdated);
      socket.off('room:chat', handleChat);
      socket.off('game:started', handleGameStarted);
      socket.off('game:player-boost', handleRemoteBoost);
      socket.off('game:player-emote', handleRemoteEmote);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect', handleReconnect);
      window.removeEventListener('offline', handleOffline);
    };
  }, [screen, currentRoom]);

  // Track ping periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setPing(networkClient.ping || 25);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Initialize and run 3D GameEngine when entering 'playing' screen
  const startGameSession = (mapId: MapId, mode: GameMode) => {
    setActiveMapId(mapId);
    setActiveMode(mode);
    setScreen('playing');
    setShowVictory(false);
    setShowPause(false);

    soundManager.startMusic();
    matchStartTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (screen !== 'playing') {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
        gameEngineRef.current = null;
      }
      return;
    }

    if (!canvasRef.current || !uiOverlayRef.current) return;

    // Create 3D GameEngine safely with error handling
    let engine: GameEngine;
    try {
      engine = new GameEngine(
        canvasRef.current,
        uiOverlayRef.current,
        customization,
        activeMapId,
        activeMode
      );
      engine.setInvertMouse(invertMouse);
    } catch (err: any) {
      console.error('[App] Failed to initialize 3D GameEngine:', err);
      setScreen('landing');
      setDisconnectNotice(
        '⚠️ 3D Graphics (WebGL) could not start. Please make sure "Hardware Acceleration" is enabled in your browser settings (or try Chrome / Edge).'
      );
      return;
    }

    // Sync callbacks
    engine.onPhysicsSync = (state) => {
      setLocalState({ ...state });
      networkClient.syncPhysics(state);
    };

    engine.onFartBoost = (pos, forward) => {
      networkClient.sendFartBoost(pos, forward);
    };

    engine.onEmoteTriggered = (emote) => {
      networkClient.sendEmote(emote);
    };

    engine.onCheckpointReached = (cp) => {
      networkClient.sendCheckpoint(cp);
    };

    engine.onFinishReached = () => {
      const elapsed = Math.round((Date.now() - matchStartTimeRef.current) / 1000);
      setCompletionTime(elapsed);
      setShowVictory(true);
      document.exitPointerLock?.();
    };

    engine.onFpsUpdate = (f) => setFps(f);

    engine.start();
    gameEngineRef.current = engine;

    // Sync any existing remote players from room state
    if (currentRoom) {
      const localId = networkClient.socket?.id;
      Object.values(currentRoom.players).forEach((p) => {
        if (p.id !== localId) {
          engine.syncRemotePlayer(p);
        }
      });
    }

    return () => {
      engine.dispose();
      gameEngineRef.current = null;
    };
  }, [screen, activeMapId, activeMode]);

  // Quick Play / Solo mode
  const handleQuickPlay = () => {
    setCurrentRoom(null);
    startGameSession('floating-islands', 'coop-obby');
  };

  // Create Room flow
  const handleCreateRoom = (data: {
    name: string;
    isPrivate: boolean;
    maxPlayers: number;
    mode: GameMode;
    mapId: MapId;
  }) => {
    networkClient.createRoom(
      {
        ...data,
        customization,
      },
      (res) => {
        if (res.success && res.code) {
          setScreen('lobby');
          soundManager.startMusic();
        } else {
          alert(res.error || 'Failed to create room.');
        }
      }
    );
  };

  // Join Room flow
  const handleJoinRoom = (code: string) => {
    networkClient.joinRoom(code, customization, (res) => {
      if (res.success && res.room) {
        setCurrentRoom(res.room);
        setActiveMapId(res.room.mapId);
        setActiveMode(res.room.mode);
        setShowBrowser(false);
        setScreen('lobby');
        soundManager.startMusic();
      } else {
        alert(res.error || 'Failed to join room.');
      }
    });
  };

  const handleLeaveGame = () => {
    document.exitPointerLock?.();
    soundManager.stopMusic();
    if (gameEngineRef.current) {
      gameEngineRef.current.dispose();
      gameEngineRef.current = null;
    }
    if (currentRoom) {
      networkClient.leaveRoom();
      setCurrentRoom(null);
    }
    setScreen('landing');
  };

  const handleNextMap = () => {
    const currentIdx = MAP_SEQUENCE.indexOf(activeMapId);
    const nextMap = MAP_SEQUENCE[(currentIdx + 1) % MAP_SEQUENCE.length];
    setActiveMapId(nextMap);
    setShowVictory(false);
    if (gameEngineRef.current) {
      gameEngineRef.current.loadMap(nextMap);
    }
    matchStartTimeRef.current = Date.now();
  };

  const handleReplay = () => {
    setShowVictory(false);
    if (gameEngineRef.current) {
      gameEngineRef.current.loadMap(activeMapId);
    }
    matchStartTimeRef.current = Date.now();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Network Disconnect Notice Banner */}
      {disconnectNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border-2 border-rose-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3.5 max-w-lg">
          <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <p className="flex-1 text-sm font-semibold text-rose-100 leading-snug">
            {disconnectNotice}
          </p>
          <button
            onClick={() => setDisconnectNotice(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Landing Screen */}
      {screen === 'landing' && (
        <LandingMenu
          customization={customization}
          onQuickPlay={handleQuickPlay}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onOpenBrowser={() => setShowBrowser(true)}
          onOpenCloset={() => setShowCustomizer(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* 2. Multiplayer Lobby Screen */}
      {screen === 'lobby' && currentRoom && (
        <LobbyRoom
          room={currentRoom}
          localPlayerId={networkClient.socket?.id || 'local'}
          customization={customization}
          onReady={(ready) => networkClient.setReady(ready)}
          onStartGame={() => networkClient.startGame()}
          onUpdateSettings={(mode, mapId) => networkClient.updateSettings({ mode, mapId })}
          onSendChat={(text) => networkClient.sendChat(text)}
          onLeaveRoom={handleLeaveGame}
          onOpenCloset={() => setShowCustomizer(true)}
          chatMessages={chatMessages}
        />
      )}

      {/* 3. Active 3D Gameplay View */}
      {screen === 'playing' && (
        <div className="relative w-full h-full">
          {/* WebGL Canvas */}
          <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

          {/* 3D UI Overlay Container for projected Player Nameplates */}
          <div ref={uiOverlayRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

          {/* Minimal, Non-Obstructive HUD with Collapsible Dock */}
          <GameHUD
            mapId={activeMapId}
            mode={activeMode}
            state={localState}
            players={currentRoom ? currentRoom.players : {}}
            localPlayerId={networkClient.socket?.id || 'local'}
            fps={fps}
            ping={ping}
            onPause={() => {
              document.exitPointerLock?.();
              setShowPause(true);
            }}
            onTriggerEmote={(emote) => gameEngineRef.current?.triggerLocalEmote(emote)}
            onReset={() => {
              if (gameEngineRef.current) {
                const pos = gameEngineRef.current.localCharacter.root.position;
                const vel = gameEngineRef.current.localState.velocity;
                gameEngineRef.current.physicsWorld.respawnPlayer(
                  gameEngineRef.current.localState,
                  pos,
                  { x: vel[0], y: vel[1], z: vel[2] } as any
                );
              }
            }}
          />

          {/* Mobile On-Screen Touch Controls */}
          {showMobileControls && (
            <MobileControls
              onMove={(fwd, side) => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.touchInput.forward = fwd;
                  gameEngineRef.current.touchInput.sideways = side;
                }
              }}
              onCameraDelta={(dYaw, dPitch) => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.addCameraDelta(dYaw, dPitch);
                }
              }}
              onJump={(isJumping) => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.touchInput.jump = isJumping;
                }
              }}
              onSprint={(isSprinting) => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.touchInput.sprint = isSprinting;
                }
              }}
              onFartBoost={(isBoosting) => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.touchInput.fartBoost = isBoosting;
                }
              }}
              onInteract={() => {
                if (gameEngineRef.current) {
                  gameEngineRef.current.triggerInteract();
                }
              }}
              onTaunt={() => {
                gameEngineRef.current?.triggerLocalEmote('taunt');
              }}
              fartCooldown={localState.fartCooldown}
            />
          )}

          {/* In-Game Pause Menu */}
          {showPause && (
            <PauseMenu
              onResume={() => setShowPause(false)}
              onRestart={() => {
                setShowPause(false);
                handleReplay();
              }}
              onOpenSettings={() => setShowSettings(true)}
              onLeave={handleLeaveGame}
            />
          )}

          {/* Victory Modal */}
          {showVictory && (
            <VictoryModal
              mapId={activeMapId}
              completionTime={completionTime}
              onNextMap={handleNextMap}
              onReplay={handleReplay}
              onReturnToLobby={() => {
                setShowVictory(false);
                if (currentRoom) setScreen('lobby');
                else setScreen('landing');
              }}
            />
          )}
        </div>
      )}

      {/* Modals available from any screen */}
      {showCustomizer && (
        <CharacterCustomizer
          customization={customization}
          onChange={handleCustomizationChange}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {showBrowser && (
        <RoomBrowserModal
          onJoinRoom={handleJoinRoom}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {showSettings && (
        <SettingsModal
          touchMode={touchMode}
          onTouchModeChange={handleTouchModeChange}
          invertMouse={invertMouse}
          onInvertMouseChange={handleInvertMouseChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
