import React, { useState } from 'react';
import { GameMode, MapId, PlayerCustomization } from '../../types/game';
import { Play, PlusCircle, Users, Shirt, HelpCircle, Settings, Globe, Wind, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';
import { MAP_METADATA } from '../../game/maps/MapDefinitions';

interface Props {
  customization: PlayerCustomization;
  onQuickPlay: () => void;
  onCreateRoom: (data: { name: string; isPrivate: boolean; maxPlayers: number; mode: GameMode; mapId: MapId }) => void;
  onJoinRoom: (code: string) => void;
  onOpenBrowser: () => void;
  onOpenCloset: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
}

export const LandingMenu: React.FC<Props> = ({
  customization,
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenBrowser,
  onOpenCloset,
  onOpenHowToPlay,
  onOpenSettings,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  // Room creation state
  const [roomName, setRoomName] = useState(`${customization.name}'s Party`);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('coop-obby');
  const [selectedMap, setSelectedMap] = useState<MapId>('floating-islands');

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setVolumes(undefined, undefined, undefined, next);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playFart();
    onCreateRoom({
      name: roomName,
      isPrivate,
      maxPlayers,
      mode: selectedMode,
      mapId: selectedMap,
    });
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundManager.playClick();
    onJoinRoom(joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-white overflow-hidden flex flex-col justify-between p-6 md:p-12">
      {/* Background Decorative Gradients & Bubbles */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-lime-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <span className="font-mono text-xs font-black text-emerald-400 uppercase tracking-widest block">v1.0 ONLINE MULTIPLAYER</span>
            <span className="text-sm font-bold text-slate-300">Physics Co-op Extravaganza</span>
          </div>
        </div>

        {/* Top Right Quick Bar */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shadow-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Wardrobe Quick Peek */}
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenCloset();
            }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-400/50 transition shadow-lg group"
          >
            <div
              className="w-6 h-6 rounded-full shadow-inner border border-white/20"
              style={{ backgroundColor: customization.color }}
            />
            <span className="text-xs font-extrabold text-white group-hover:text-emerald-400 transition">
              {customization.name}
            </span>
          </button>
        </div>
      </header>

      {/* Hero Center Title & Main Action Buttons */}
      <main className="relative z-10 my-auto py-8 max-w-3xl mx-auto w-full text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest shadow-inner">
            <Sparkles className="w-4 h-4" /> 3D RAGDOLL & FART PHYSICS
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white drop-shadow-md">
            TOOT <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">TOGETHER</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto font-medium">
            Tumble, slip, solve co-op obstacle courses, and propel yourself with humorous fart-powered rocket boosts with up to 8 players!
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-lg mx-auto">
          {/* Quick Play / Solo */}
          <button
            onClick={() => {
              soundManager.playFart();
              onQuickPlay();
            }}
            className="col-span-1 sm:col-span-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-lg shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition transform active:scale-98"
          >
            <Play className="w-6 h-6 fill-current" /> QUICK PLAY / PRACTICE 💨
          </button>

          {/* Create Room */}
          <button
            onClick={() => {
              soundManager.playClick();
              setShowCreateModal(true);
            }}
            className="py-3.5 px-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-emerald-500/50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition transform active:scale-98"
          >
            <PlusCircle className="w-5 h-5 text-emerald-400" /> Create Co-op Room
          </button>

          {/* Join Room */}
          <button
            onClick={() => {
              soundManager.playClick();
              setShowJoinModal(true);
            }}
            className="py-3.5 px-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition transform active:scale-98"
          >
            <Users className="w-5 h-5 text-cyan-400" /> Join via Code
          </button>
        </div>

        {/* Secondary Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onOpenBrowser();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <Globe className="w-4 h-4 text-cyan-400" /> Public Lobbies
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenCloset();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <Shirt className="w-4 h-4 text-pink-400" /> Character Closet
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenHowToPlay();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" /> How to Play
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <Settings className="w-4 h-4 text-purple-400" /> Settings
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-900 gap-2">
        <span>Original 3D Comedy Game • Real-time Socket.IO Multiplayer • 60 FPS Low-Spec Ready</span>
        <span>Keyboard: W/A/S/D • [F] Fart Boost • [E] Grab/Throw • [R] Recover</span>
      </footer>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-emerald-400" /> Create Co-op Room
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={24}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Max Players (2 to 8)
                </label>
                <div className="flex gap-2">
                  {[2, 4, 6, 8].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold border transition ${
                        maxPlayers === num
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {num} Players
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Initial Map
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(MAP_METADATA) as MapId[]).map((mid) => {
                    const m = MAP_METADATA[mid];
                    return (
                      <button
                        key={mid}
                        type="button"
                        onClick={() => setSelectedMap(mid)}
                        className={`p-2.5 rounded-xl text-left border transition ${
                          selectedMap === mid
                            ? 'border-emerald-400 ring-2 ring-emerald-400/30 text-white bg-emerald-500/10'
                            : 'border-slate-700 text-slate-400 hover:text-white bg-slate-800/60'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.difficulty}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="priv"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded accent-emerald-400 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="priv" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Private Room (Hidden from Public Browser)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-black text-sm text-slate-950 shadow-xl"
                >
                  Create & Launch 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN VIA CODE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-sm bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" /> Join via Room Code
            </h2>
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Enter 6-Letter Room Code
                </label>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. TOOT-42"
                  maxLength={10}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-cyan-300 font-mono font-black text-center text-lg tracking-widest focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 font-black text-sm text-slate-950 shadow-xl"
                >
                  Join Room 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
