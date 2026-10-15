import React, { useState } from 'react';
import { GameMode, MapId, NetworkPlayer, PlayerPhysicsState } from '../../types/game';
import { MAP_METADATA } from '../../game/maps/MapDefinitions';
import { ChevronDown, ChevronUp, Pause, Wind, Award, Zap, Smile, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  mapId: MapId;
  mode: GameMode;
  state: PlayerPhysicsState;
  players: Record<string, NetworkPlayer>;
  localPlayerId: string;
  fps: number;
  ping: number;
  onPause: () => void;
  onTriggerEmote: (emote: string) => void;
  onReset: () => void;
}

export const GameHUD: React.FC<Props> = ({
  mapId,
  mode,
  state,
  players,
  localPlayerId,
  fps,
  ping,
  onPause,
  onTriggerEmote,
  onReset,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);

  const mapMeta = MAP_METADATA[mapId];
  const maxFartCooldown = 2.2;
  const fartReady = state.fartCooldown <= 0;
  const cooldownPercent = Math.max(0, Math.min(100, (1 - state.fartCooldown / maxFartCooldown) * 100));

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setVolumes(undefined, undefined, undefined, next);
  };

  const otherPlayers = Object.values(players).filter((p) => p.id !== localPlayerId);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4">
      {/* Top Bar: Title & Stats Badges (Minimal, unobtrusive) */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Map & Mode Badge */}
        <div className="flex items-center gap-3">
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3.5 py-2 rounded-2xl shadow-lg flex items-center gap-2.5 text-white">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: mapMeta?.previewColor || '#10b981' }}
            />
            <div>
              <div className="font-extrabold text-xs tracking-wide">{mapMeta?.name || 'Obstacle Obby'}</div>
              <div className="text-[10px] text-slate-400 capitalize">{mode.replace('-', ' ')}</div>
            </div>
          </div>

          {/* Checkpoint Badge */}
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 text-white">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">
              {state.hasFinished ? '🏆 FINISHED!' : `Checkpoint ${state.checkpoint}`}
            </span>
          </div>
        </div>

        {/* Center: Ragdoll Stumble Notice (if active) */}
        {state.isRagdoll && (
          <div className="pointer-events-auto bg-rose-500/90 text-slate-950 font-black px-4 py-1.5 rounded-full shadow-2xl text-xs uppercase tracking-wider animate-bounce">
            😵 Stumbled! Shaking it off...
          </div>
        )}

        {/* Right: Performance & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white transition shadow-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* FPS & Latency */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-300 shadow-lg flex items-center gap-2">
            <span className="text-emerald-400 font-bold">{fps} FPS</span>
            <span>•</span>
            <span className="text-slate-400">{ping}ms</span>
          </div>

          {/* Pause Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onPause();
            }}
            className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white transition shadow-lg flex items-center gap-1.5 text-xs font-bold"
          >
            <Pause className="w-4 h-4" /> [Esc]
          </button>
        </div>
      </div>

      {/* Center Viewport remains 100% unobstructed! */}

      {/* Unified Bottom Dock: Ergonomic, Glassmorphic, Collapsible */}
      <div className="w-full flex flex-col items-center pointer-events-none pb-2">
        {/* Toggle Collapse/Expand Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            setIsDockCollapsed(!isDockCollapsed);
          }}
          className="pointer-events-auto mb-2 px-3.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show Controls & Abilities
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide Dock (Zen View)
            </>
          )}
        </button>

        {/* Dock Container */}
        {!isDockCollapsed && (
          <div className="pointer-events-auto max-w-[min(940px,94vw)] w-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-4 text-white transition-transform">
            {/* Fart Boost Ability Gauge */}
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition transform ${
                  fartReady
                    ? 'bg-gradient-to-tr from-emerald-500 to-lime-400 text-slate-950 shadow-emerald-500/25 scale-105'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Wind className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-wide">FART BOOST</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] font-bold text-emerald-300">
                    [F]
                  </span>
                </div>
                {/* Cooldown progress bar */}
                <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-75"
                    style={{ width: `${cooldownPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions / Emotes Dock */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  soundManager.playBounce();
                  onTriggerEmote('wave');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                title="Key 1"
              >
                <span>👋 Wave</span>
                <span className="text-[10px] text-slate-400">[1]</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playBounce();
                  onTriggerEmote('dance');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                title="Key 2"
              >
                <span>💃 Dance</span>
                <span className="text-[10px] text-slate-400">[2]</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playBounce();
                  onTriggerEmote('laugh');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                title="Key 3"
              >
                <span>😂 Laugh</span>
                <span className="text-[10px] text-slate-400">[3]</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playBounce();
                  onTriggerEmote('taunt');
                }}
                className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-pink-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                title="Taunt rivals [T]"
              >
                <span>😜 Taunt</span>
                <span className="text-[10px] text-pink-400/80 font-mono">[T]</span>
              </button>
            </div>

            {/* Teammates online pills */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Buddies:</span>
              {otherPlayers.length === 0 ? (
                <span className="italic text-slate-500">Solo play</span>
              ) : (
                otherPlayers.slice(0, 4).map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 rounded-full font-bold text-[10px] shadow-sm text-white"
                    style={{ backgroundColor: p.customization.color || '#3b82f6' }}
                  >
                    {p.name}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
