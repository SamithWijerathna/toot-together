'use client';

import dynamic from 'next/dynamic';
import { Wind } from 'lucide-react';

const GameApp = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white select-none">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-lime-400 flex items-center justify-center text-slate-950 shadow-2xl shadow-emerald-500/40 animate-bounce">
        <Wind className="w-8 h-8" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-white">
        TOOT <span className="text-emerald-400">TOGETHER</span>
      </h1>
      <p className="mt-1 text-xs text-slate-400 font-semibold tracking-wider uppercase">
        Loading 3D Physics Engine & Multiplayer...
      </p>
    </div>
  ),
});

export default function Page() {
  return <GameApp />;
}
