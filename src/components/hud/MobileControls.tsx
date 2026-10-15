import React, { useRef, useState, useEffect } from 'react';
import { Wind, ArrowUp, Zap, Hand, RefreshCw } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  onMove: (forward: number, sideways: number) => void;
  onCameraDelta: (deltaYaw: number, deltaPitch: number) => void;
  onJump: (isJumping: boolean) => void;
  onSprint: (isSprinting: boolean) => void;
  onFartBoost: (isBoosting: boolean) => void;
  onInteract: () => void;
  onRecover: () => void;
  fartCooldown: number;
}

export const MobileControls: React.FC<Props> = ({
  onMove,
  onCameraDelta,
  onJump,
  onSprint,
  onFartBoost,
  onInteract,
  onRecover,
  fartCooldown,
}) => {
  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);

  // Camera look touch state
  const cameraTouchIdRef = useRef<number | null>(null);
  const lastCameraTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Sprint toggle state
  const [isSprintLocked, setIsSprintLocked] = useState(false);

  // Max joystick radius
  const MAX_RADIUS = 46;

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    setIsJoystickActive(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: clampedX, y: clampedY });

    // Normalized outputs (-1 to 1)
    const normX = clampedX / MAX_RADIUS;
    const normY = clampedY / MAX_RADIUS;

    // Invert Y: dragging upward produces positive forward
    onMove(-normY, normX);
  };

  // Camera swipe look handlers
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    if (cameraTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    cameraTouchIdRef.current = touch.identifier;
    lastCameraTouchRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCameraTouchMove = (e: React.TouchEvent) => {
    if (cameraTouchIdRef.current === null || !lastCameraTouchRef.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === cameraTouchIdRef.current) {
        const dx = touch.clientX - lastCameraTouchRef.current.x;
        const dy = touch.clientY - lastCameraTouchRef.current.y;
        lastCameraTouchRef.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.005;
        onCameraDelta(dx * sensitivity, dy * sensitivity);
        break;
      }
    }
  };

  const handleCameraTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === cameraTouchIdRef.current) {
        cameraTouchIdRef.current = null;
        lastCameraTouchRef.current = null;
        break;
      }
    }
  };

  const toggleSprint = () => {
    soundManager.playClick();
    const next = !isSprintLocked;
    setIsSprintLocked(next);
    onSprint(next);
  };

  const fartReady = fartCooldown <= 0;
  const fartPercent = Math.max(0, Math.min(100, (1 - fartCooldown / 2.2) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none touch-none">
      {/* 1. Camera Look Swipe Surface (Takes up the upper & right area) */}
      <div
        className="absolute inset-0 pointer-events-auto"
        style={{ clipPath: 'polygon(35% 0%, 100% 0%, 100% 100%, 65% 100%, 35% 60%)' }}
        onTouchStart={handleCameraTouchStart}
        onTouchMove={handleCameraTouchMove}
        onTouchEnd={handleCameraTouchEnd}
        onTouchCancel={handleCameraTouchEnd}
      />

      {/* 2. Left Side: Floating Virtual Joystick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col items-center">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          className={`relative w-32 h-32 rounded-full border-2 flex items-center justify-center transition-colors backdrop-blur-md shadow-2xl ${
            isJoystickActive
              ? 'bg-slate-900/70 border-emerald-400/80 shadow-emerald-500/20'
              : 'bg-slate-950/50 border-white/20'
          }`}
        >
          {/* Subtle directional indicators */}
          <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-white/40" />
          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/40" />

          {/* Inner Thumb Knob */}
          <div
            className={`w-14 h-14 rounded-full shadow-lg border flex items-center justify-center transform transition-transform duration-75 ${
              isJoystickActive
                ? 'bg-emerald-500/90 border-white text-slate-950 scale-105'
                : 'bg-slate-800/80 border-white/30 text-white'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/60" />
          </div>
        </div>
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Move</span>
      </div>

      {/* 3. Right Side: Ergonomic Action Buttons Cluster */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-end gap-3">
        {/* Secondary Vertical Stack: Sprint, Interact, Recover */}
        <div className="flex flex-col gap-2.5 items-center mb-1">
          {/* Sprint Toggle */}
          <button
            onClick={toggleSprint}
            className={`w-12 h-12 rounded-2xl border flex flex-col items-center justify-center text-xs font-bold shadow-lg transition active:scale-90 ${
              isSprintLocked
                ? 'bg-amber-500/90 border-amber-300 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-300'
            }`}
            title="Sprint Lock"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span className="text-[9px] font-black">{isSprintLocked ? 'SPRINT' : 'WALK'}</span>
          </button>

          {/* Interact / Grab */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            onClick={onInteract}
            className="w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-cyan-300 flex flex-col items-center justify-center shadow-lg transition active:scale-90"
            title="Grab / Throw [E]"
          >
            <Hand className="w-5 h-5" />
            <span className="text-[9px] font-black">GRAB</span>
          </button>

          {/* Recover / Respawn */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onRecover();
            }}
            onClick={onRecover}
            className="w-11 h-11 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-rose-300 flex items-center justify-center shadow-lg transition active:scale-90"
            title="Recover / Reset [R]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Stack: Jump & Big Fart Boost */}
        <div className="flex flex-col gap-3 items-center">
          {/* Jump Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onJump(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onJump(false);
            }}
            onMouseDown={() => onJump(true)}
            onMouseUp={() => onJump(false)}
            className="w-14 h-14 rounded-3xl bg-blue-500/80 active:bg-blue-400 border-2 border-blue-300/80 text-white flex flex-col items-center justify-center shadow-xl shadow-blue-500/30 transition active:scale-90"
          >
            <ArrowUp className="w-6 h-6 stroke-[3]" />
            <span className="text-[9px] font-black tracking-wider">JUMP</span>
          </button>

          {/* FART BOOST - Big Hero Action Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onFartBoost(true);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onFartBoost(false);
            }}
            onMouseDown={() => onFartBoost(true)}
            onMouseUp={() => onFartBoost(false)}
            disabled={!fartReady}
            className={`relative w-20 h-20 rounded-full border-3 flex flex-col items-center justify-center shadow-2xl transition transform active:scale-90 ${
              fartReady
                ? 'bg-gradient-to-tr from-emerald-500 via-lime-400 to-teal-400 border-white text-slate-950 shadow-emerald-500/50 scale-100 cursor-pointer animate-pulse'
                : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-80 cursor-not-allowed'
            }`}
          >
            {/* SVG Cooldown radial ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-800"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * fartPercent) / 100}
                className="text-emerald-400 transition-all duration-75"
              />
            </svg>

            <Wind className="w-8 h-8 relative z-10 drop-shadow-sm" />
            <span className="text-[10px] font-black tracking-wider relative z-10">
              {fartReady ? 'FART!' : `${fartCooldown.toFixed(1)}s`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
