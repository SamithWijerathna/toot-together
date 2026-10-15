import React, { useState } from 'react';
import { GameMode, MapId, PlayerCustomization, RoomState } from '../../types/game';
import { MAP_METADATA } from '../../game/maps/MapDefinitions';
import { Crown, CheckCircle2, Play, Copy, Check, MessageSquare, Send, ArrowLeft, Shirt, Sliders } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  room: RoomState;
  localPlayerId: string;
  customization: PlayerCustomization;
  onReady: (ready: boolean) => void;
  onStartGame: () => void;
  onUpdateSettings: (mode: GameMode, mapId: MapId) => void;
  onSendChat: (msg: string) => void;
  onLeaveRoom: () => void;
  onOpenCloset: () => void;
  chatMessages: Array<{ sender: string; text: string; isSystem?: boolean }>;
}

const MODES: Array<{ id: GameMode; name: string; desc: string }> = [
  { id: 'coop-obby', name: 'Co-op Obby', desc: 'Work together through obstacles, moving platforms, and reach the finish!' },
  { id: 'physics-playground', name: 'Physics Sandbox', desc: 'Freely explore trampolines, see-saws, balls, and gas cannons.' },
  { id: 'team-challenges', name: 'Team Challenges', desc: 'Step on dual buttons, push heavy crates, and beat the clock!' },
  { id: 'last-player', name: 'Last Player Standing', desc: 'Blast rivals off the shrinking bouncy arena with fart knockback!' },
  { id: 'time-trial', name: 'Time Trial Speedrun', desc: 'Race against the clock for the fastest recorded time!' },
];

const MAPS: MapId[] = Object.keys(MAP_METADATA) as MapId[];

export const LobbyRoom: React.FC<Props> = ({
  room,
  localPlayerId,
  onReady,
  onStartGame,
  onUpdateSettings,
  onSendChat,
  onLeaveRoom,
  onOpenCloset,
  chatMessages,
}) => {
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const isHost = room.hostId === localPlayerId;
  const localPlayer = room.players[localPlayerId];
  const isReady = localPlayer?.isReady ?? false;
  const playersList = Object.values(room.players);
  const allReady = playersList.every((p) => p.isReady || p.isHost);

  const handleCopyCode = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    soundManager.playClick();
    onSendChat(chatInput);
    setChatInput('');
  };

  const currentMapMeta = MAP_METADATA[room.mapId];

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white flex flex-col p-4 md:p-8">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              soundManager.playClick();
              onLeaveRoom();
            }}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft className="w-5 h-5" /> Leave Lobby
          </button>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Multiplayer Room</span>
            <h1 className="text-2xl font-black">{room.name}</h1>
          </div>
        </div>

        {/* Room Code Banner */}
        <div className="flex items-center gap-3 bg-slate-900 border-2 border-emerald-500/40 px-4 py-2 rounded-2xl shadow-lg">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Code:</span>
          <span className="font-mono text-xl font-black text-emerald-400 tracking-widest">{room.code}</span>
          <button
            onClick={handleCopyCode}
            className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition"
            title="Copy Code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 py-6">
        {/* Left Column: Player Roster & Chat (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Players Roster */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                👥 Players in Party ({playersList.length}/{room.maxPlayers})
              </h3>
              <button
                onClick={() => {
                  soundManager.playClick();
                  onOpenCloset();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition"
              >
                <Shirt className="w-4 h-4" /> Change Character
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {playersList.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner border border-white/20"
                      style={{ backgroundColor: p.customization.color || '#3b82f6' }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        <span>{p.name}</span>
                        {p.isHost && (
                          <span title="Host">
                            <Crown className="w-4 h-4 text-amber-400" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {p.customization.accessory !== 'none' ? p.customization.accessory : 'Classic Bean'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {p.isHost ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                        Host
                      </span>
                    ) : p.isReady ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 text-xs font-semibold">
                        Waiting...
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty slot placeholders */}
              {Array.from({ length: Math.max(0, room.maxPlayers - playersList.length) }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl border-2 border-dashed border-slate-800/80 flex items-center justify-center text-xs font-semibold text-slate-600 select-none"
                >
                  + Slot Open for Buddy
                </div>
              ))}
            </div>
          </div>

          {/* Lobby Chatbox */}
          <div className="flex-1 min-h-[220px] bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col">
            <h4 className="font-extrabold text-sm text-slate-400 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-emerald-400" /> Lobby Chat
            </h4>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-xs">
              {chatMessages.length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center">Say hi or discuss your obstacle strategy!</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl max-w-[85%] ${
                      msg.isSystem
                        ? 'bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20'
                        : 'bg-slate-800/80 border border-slate-700/60'
                    }`}
                  >
                    {!msg.isSystem && <span className="font-bold text-slate-300 block">{msg.sender}:</span>}
                    <span className="text-white">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={100}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Game Mode & Map Configuration (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" /> Match Settings
              </h3>
              {!isHost && <span className="text-xs text-slate-400 italic">Host controls settings</span>}
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Game Mode
              </label>
              <div className="space-y-2">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    disabled={!isHost}
                    onClick={() => {
                      soundManager.playClick();
                      onUpdateSettings(m.id, room.mapId);
                    }}
                    className={`w-full p-3 rounded-2xl text-left border transition ${
                      room.mode === m.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                    } ${!isHost ? 'cursor-default' : ''}`}
                  >
                    <div className="font-black text-sm">{m.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Map Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select 3D Map
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MAPS.map((mid) => {
                  const meta = MAP_METADATA[mid];
                  if (!meta) return null;
                  return (
                    <button
                      key={mid}
                      disabled={!isHost}
                      onClick={() => {
                        soundManager.playClick();
                        onUpdateSettings(room.mode, mid);
                      }}
                      className={`p-3 rounded-2xl text-left border transition ${
                        room.mapId === mid
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40 text-white'
                          : 'border-slate-700/60 text-slate-400 hover:text-white'
                      } ${!isHost ? 'cursor-default' : ''}`}
                      style={{
                        backgroundColor: room.mapId === mid ? `${meta.previewColor}25` : 'rgba(30, 41, 59, 0.6)',
                      }}
                    >
                      <div className="font-extrabold text-xs">{meta.name}</div>
                      <div className="text-[11px] text-slate-400">{meta.difficulty}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Details Card */}
            {currentMapMeta && (
              <div
                className="p-4 rounded-2xl border text-xs space-y-1.5"
                style={{
                  borderColor: `${currentMapMeta.previewColor}60`,
                  backgroundColor: `${currentMapMeta.previewColor}15`,
                }}
              >
                <div className="font-black text-sm text-white">{currentMapMeta.name}</div>
                <p className="text-slate-300">{currentMapMeta.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentMapMeta.features.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-900/80 text-[10px] font-bold text-emerald-300">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Card */}
          <div className="pt-2">
            {isHost ? (
              <button
                onClick={() => {
                  soundManager.playFart();
                  onStartGame();
                }}
                disabled={!allReady}
                className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-2xl transition transform active:scale-98 ${
                  allReady
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 hover:brightness-110 cursor-pointer animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Play className="w-6 h-6 fill-current" />
                {allReady ? 'LAUNCH MATCH! 🚀' : 'Waiting for Players to Ready...'}
              </button>
            ) : (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onReady(!isReady);
                }}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-2xl transition transform active:scale-98 ${
                  isReady
                    ? 'bg-slate-800 border-2 border-emerald-400 text-emerald-300 hover:bg-slate-700'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110'
                }`}
              >
                {isReady ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> You Are Ready! (Click to Unready)
                  </>
                ) : (
                  'Ready Up! 👍'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
