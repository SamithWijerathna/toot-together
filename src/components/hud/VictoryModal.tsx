import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, RotateCcw, Home, Sparkles } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';
import { MapId } from '../../types/game';

interface Props {
  mapId: MapId;
  completionTime: number;
  onNextMap: () => void;
  onReplay: () => void;
  onReturnToLobby: () => void;
}

export const VictoryModal: React.FC<Props> = ({
  mapId,
  completionTime,
  onNextMap,
  onReplay,
  onReturnToLobby,
}) => {
  useEffect(() => {
    // Blast victory confetti!
    soundManager.playCheckpoint();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#38bdf8', '#facc15', '#ec4899', '#8b5cf6'],
    });

    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-400/80 rounded-3xl shadow-2xl p-6 text-white text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-2xl shadow-amber-500/40 text-slate-950">
          <Trophy className="w-10 h-10 fill-current animate-bounce" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Stage Cleared!
          </span>
          <h2 className="text-3xl font-black mt-2 text-white">VICTORY TOOT! 💨</h2>
          <p className="text-sm text-slate-300 mt-1">You conquered the obstacles and reached the Golden Throne!</p>
        </div>

        {/* Stats card */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Course Time</span>
            <span className="text-2xl font-mono font-black text-amber-400">{formatTime(completionTime)}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
            <span className="text-2xl font-black text-emerald-400">100% OK!</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onNextMap();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl transition transform active:scale-98"
          >
            Next Map Challenge <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onReplay();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Replay Map
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onReturnToLobby();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" /> Return to Menu / Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
