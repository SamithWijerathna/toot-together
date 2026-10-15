import React from 'react';
import { X, Wind, Zap, Users, ShieldAlert, Award } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl p-6 text-white max-h-[85vh] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">How to Toot Together</h2>
              <p className="text-xs text-slate-400">Master the ridiculous physics and teamwork tactics.</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5 text-sm">
          {/* Controls Table */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              ⌨️ Keyboard & Mouse Controls
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">W, A, S, D</span>
                <span className="text-slate-300">Run Around</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Spacebar</span>
                <span className="text-slate-300">Jump / Hop</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Shift</span>
                <span className="text-slate-300">Sprint Dash</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Key F</span>
                <span className="text-emerald-300 font-bold">💨 FART BOOST!</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Key E</span>
                <span className="text-slate-300">Grab / Throw Object</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Key R</span>
                <span className="text-slate-300">Recover from Ragdoll</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">1, 2, 3</span>
                <span className="text-slate-300">Wave / Dance / Laugh</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Mouse</span>
                <span className="text-slate-300">Camera Orbit</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/50">
                <span className="text-emerald-400 font-bold block mb-1">Esc</span>
                <span className="text-slate-300">Pause Menu</span>
              </div>
            </div>

            {/* Mobile Touch Controls Guide */}
            <div className="pt-3 border-t border-slate-700/60 mt-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-cyan-300">
                📱 Mobile & Tablet Touch Controls
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/50">
                  <span className="text-cyan-400 font-bold block">Left Joystick</span>
                  <span className="text-slate-400 text-[11px]">Move Character</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/50">
                  <span className="text-cyan-400 font-bold block">Right Swipe</span>
                  <span className="text-slate-400 text-[11px]">Rotate Camera</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/50">
                  <span className="text-emerald-400 font-bold block">💨 Big Fart</span>
                  <span className="text-slate-400 text-[11px]">Rocket Boost</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/50">
                  <span className="text-blue-400 font-bold block">Jump & Grab</span>
                  <span className="text-slate-400 text-[11px]">Hop & Carry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gameplay Mechanics */}
          <div className="space-y-3">
            <div className="flex gap-3 items-start p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Wind className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">The Fart Rocket Propulsion:</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  Pressing [F] releases a sudden pressurized blast that launches you across gaps, propels you high into the air, and knocks back nearby obstacles and friends!
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Co-op Teamwork & Dual Switches:</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  Massive barrier gates require either two players stepping on switches simultaneously, or carrying a heavy wooden crate or barrel to hold down the button for your teammate!
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Slippery Physics & Ragdoll Tumbling:</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  Greasy factory tracks reduce friction to near zero. If you collide or get blasted, you enter a hilarious ragdoll flop! Tap [R] or wait a second to shake off the dizziness and jump back to your feet.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Award className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Checkpoints & Golden Finish:</strong>
                <p className="text-slate-300 text-xs mt-0.5">
                  Step on green glowing pads along the course to save your checkpoint. If you fall into the void, you will respawn instantly with zero progress lost!
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-lg hover:brightness-110 transition"
        >
          Got It, Let&apos;s Play! 💥
        </button>
      </div>
    </div>
  );
};
