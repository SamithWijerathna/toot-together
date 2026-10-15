import React, { useState } from 'react';
import { X, Volume2, VolumeX, Sliders, Monitor, Smartphone, MousePointer } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  touchMode?: 'auto' | 'on' | 'off';
  onTouchModeChange?: (mode: 'auto' | 'on' | 'off') => void;
  invertMouse?: boolean;
  onInvertMouseChange?: (invert: boolean) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  touchMode = 'auto',
  onTouchModeChange,
  invertMouse = false,
  onInvertMouseChange,
  onClose,
}) => {
  const [masterVol, setMasterVol] = useState(soundManager.masterVolume);
  const [sfxVol, setSfxVol] = useState(soundManager.sfxVolume);
  const [musicVol, setMusicVol] = useState(soundManager.musicVolume);
  const [muted, setMuted] = useState(soundManager.isMuted);
  const [graphics, setGraphics] = useState<'low' | 'med' | 'high'>('high');
  const [currentTouchMode, setCurrentTouchMode] = useState<'auto' | 'on' | 'off'>(touchMode);
  const [currentInvertMouse, setCurrentInvertMouse] = useState<boolean>(invertMouse);

  const handleMasterChange = (val: number) => {
    setMasterVol(val);
    soundManager.setVolumes(val, sfxVol, musicVol, muted);
  };

  const handleSfxChange = (val: number) => {
    setSfxVol(val);
    soundManager.setVolumes(masterVol, val, musicVol, muted);
    soundManager.playFart(1.2);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundManager.setVolumes(masterVol, sfxVol, val, muted);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundManager.setVolumes(masterVol, sfxVol, musicVol, nextMuted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl p-6 text-white space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black">Audio & Graphics</h2>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sound Master</span>
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                muted ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {muted ? 'Muted' : 'Unmuted'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Master Volume</span>
              <span>{Math.round(masterVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVol}
              onChange={(e) => handleMasterChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>SFX Volume (Farts & Impacts)</span>
              <span>{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Music Volume</span>
              <span>{Math.round(musicVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVol}
              onChange={(e) => handleMusicChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Graphics Performance Preset */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Monitor className="w-4 h-4" /> Graphics Performance
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'med', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setGraphics(lvl)}
                className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                  graphics === lvl
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            {graphics === 'low' && 'Optimized for low-spec PCs: reduced shadows & particles for solid 60 FPS.'}
            {graphics === 'med' && 'Balanced visual quality and stable 60 FPS frame rates.'}
            {graphics === 'high' && 'Full PBR studio reflections, soft PCF shadows, and dynamic particle bursts.'}
          </p>
        </div>

        {/* Mobile Touch Controls Mode */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Smartphone className="w-4 h-4 text-emerald-400" /> On-Screen Mobile Controls
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['auto', 'on', 'off'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  soundManager.playClick();
                  setCurrentTouchMode(m);
                  if (onTouchModeChange) onTouchModeChange(m);
                }}
                className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                  currentTouchMode === m
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'auto' ? 'Auto Detect' : m === 'on' ? 'Always On' : 'Disabled'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            {currentTouchMode === 'auto' && 'Shows touch joystick and buttons automatically on phones and tablets.'}
            {currentTouchMode === 'on' && 'Forces on-screen touch joystick and buttons on all devices.'}
            {currentTouchMode === 'off' && 'Hides mobile touch overlay (pure keyboard/mouse mode).'}
          </p>
        </div>

        {/* Mouse Camera Look (Y-Axis) */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <MousePointer className="w-4 h-4 text-emerald-400" /> Invert Mouse Look (Y-Axis)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setCurrentInvertMouse(false);
                if (onInvertMouseChange) onInvertMouseChange(false);
              }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                !currentInvertMouse
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Normal (Off)
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setCurrentInvertMouse(true);
                if (onInvertMouseChange) onInvertMouseChange(true);
              }}
              className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${
                currentInvertMouse
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              Inverted (On)
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {currentInvertMouse
              ? 'Inverted (On): Moving mouse forward/up looks down; moving backward/down looks up.'
              : 'Normal (Off): Moving mouse forward/up looks up; moving backward/down looks down.'}
          </p>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};
