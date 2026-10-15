import React from 'react';
import { Play, RotateCcw, Settings, LogOut, X } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
}

export const PauseMenu: React.FC<Props> = ({ onResume, onRestart, onOpenSettings, onLeave }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm bg-slate-900 border-2 border-slate-700/80 rounded-3xl shadow-2xl p-6 text-white text-center space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Match Paused</span>
          <h2 className="text-2xl font-black mt-1">Take a Breather! 💨</h2>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onResume();
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition transform active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" /> Resume Match
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onRestart();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <RotateCcw className="w-4 h-4" /> Respawn at Checkpoint [R]
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onOpenSettings();
            }}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Settings className="w-4 h-4" /> Audio & Controls
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onLeave();
            }}
            className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" /> Return to Lobby / Menu
          </button>
        </div>
      </div>
    </div>
  );
};
