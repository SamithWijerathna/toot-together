import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlayerCustomization } from '../../types/game';
import { CharacterMesh } from '../../game/character/CharacterMesh';
import { Check, Sparkles, Smile, Palette, HardHat } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface Props {
  customization: PlayerCustomization;
  onChange: (customization: PlayerCustomization) => void;
  onClose: () => void;
}

const BODY_COLORS = [
  { name: 'Toxic Lime', hex: '#84cc16' },
  { name: 'Bubblegum', hex: '#ec4899' },
  { name: 'Neon Cyan', hex: '#06b6d4' },
  { name: 'Sunny Orange', hex: '#f97316' },
  { name: 'Royal Violet', hex: '#8b5cf6' },
  { name: 'Cherry Red', hex: '#ef4444' },
  { name: 'Golden Yellow', hex: '#eab308' },
  { name: 'Mint Green', hex: '#10b981' },
  { name: 'Cool Slate', hex: '#64748b' },
  { name: 'Cocoa Brown', hex: '#854d0e' },
];

const BELLY_COLORS = [
  { name: 'Cream White', hex: '#fef08a' },
  { name: 'Soft Peach', hex: '#fed7aa' },
  { name: 'Ice Mint', hex: '#a7f3d0' },
  { name: 'Sky Blue', hex: '#bae6fd' },
  { name: 'Cotton Candy', hex: '#fbcfe8' },
  { name: 'Lavender', hex: '#ddd6fe' },
];

const ACCESSORIES = [
  { id: 'none', name: 'No Hat' },
  { id: 'propeller', name: 'Propeller Beanie' },
  { id: 'chef', name: 'Master Chef' },
  { id: 'party', name: 'Party Cone' },
  { id: 'horns', name: 'Viking Horns' },
  { id: 'plunger', name: 'Golden Plunger' },
  { id: 'sunglasses', name: 'Cool Shades' },
  { id: 'halo', name: 'Angel Halo' },
];

const EXPRESSIONS: Array<{ id: PlayerCustomization['faceExpression']; name: string }> = [
  { id: 'happy', name: 'Happy 😊' },
  { id: 'silly', name: 'Goofy 🤪' },
  { id: 'shocked', name: 'Gassy 😲' },
  { id: 'cool', name: 'Cool 😎' },
  { id: 'dizzy', name: 'Dizzy 😵' },
];

export const CharacterCustomizer: React.FC<Props> = ({ customization, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshRef = useRef<CharacterMesh | null>(null);

  // 3D Preview Setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 0.9, 2.5);
    camera.lookAt(0, 0.65, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    const character = new CharacterMesh(customization);
    scene.add(character.root);
    meshRef.current = character;

    let animId: number;
    const clock = new THREE.Clock();

    const render = () => {
      animId = requestAnimationFrame(render);
      const delta = clock.getDelta();
      // Slow showcase rotation
      character.root.rotation.y += delta * 0.8;
      character.animate(delta, false, false, true, false, null);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      character.dispose();
      renderer.dispose();
    };
  }, []);

  // Update preview mesh on customization changes
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.updateCustomization(customization);
    }
  }, [customization]);

  const updateProp = <K extends keyof PlayerCustomization>(key: K, value: PlayerCustomization[K]) => {
    soundManager.playClick();
    onChange({ ...customization, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: 3D Live Interactive Avatar */}
        <div className="relative w-full md:w-5/12 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-700/60">
          <div className="text-center mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Live 3D Mirror
            </span>
            <h3 className="text-xl font-extrabold text-white mt-1">{customization.name || 'Toot Buddy'}</h3>
          </div>

          <div className="w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-inner border border-slate-700 bg-slate-900/60 relative">
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-slate-400 select-none">
              Auto-rotating preview
            </div>
          </div>

          {/* Test Emote buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                soundManager.playFart();
                if (meshRef.current) meshRef.current.animate(0.1, false, false, true, false, 'dance', true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center gap-1"
            >
              💨 Test Fart
            </button>
            <button
              onClick={() => {
                soundManager.playBounce();
                if (meshRef.current) meshRef.current.animate(0.1, false, false, true, false, 'wave');
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition flex items-center gap-1"
            >
              👋 Wave
            </button>
          </div>
        </div>

        {/* Right Side: Customization Controls */}
        <div className="w-full md:w-7/12 p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <Palette className="w-6 h-6 text-emerald-400" /> Buddy Wardrobe
            </h2>
            <p className="text-sm text-slate-400">Design your ridiculous cartoon character for multiplayer shenanigans.</p>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Player Name
            </label>
            <input
              type="text"
              maxLength={16}
              value={customization.name}
              onChange={(e) => updateProp('name', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold focus:outline-none focus:border-emerald-400 transition"
              placeholder="Enter your buddy name"
            />
          </div>

          {/* Skin Color Palette */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              Body Color
            </label>
            <div className="grid grid-cols-5 gap-2.5">
              {BODY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateProp('color', c.hex)}
                  className={`h-11 rounded-xl flex items-center justify-center transition transform active:scale-95 shadow-md relative ${
                    customization.color === c.hex ? 'ring-3 ring-white scale-105' : 'hover:opacity-90'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {customization.color === c.hex && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          {/* Belly Color */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Belly Accent Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {BELLY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateProp('secondaryColor', c.hex)}
                  className={`h-9 rounded-xl flex items-center justify-center transition ${
                    customization.secondaryColor === c.hex ? 'ring-2 ring-emerald-400 scale-105' : 'hover:opacity-90'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {customization.secondaryColor === c.hex && <Check className="w-4 h-4 text-slate-900" />}
                </button>
              ))}
            </div>
          </div>

          {/* Hats & Accessories */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <HardHat className="w-4 h-4 text-emerald-400" /> Hats & Accessories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCESSORIES.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => updateProp('accessory', acc.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition text-left border ${
                    customization.accessory === acc.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {acc.name}
                </button>
              ))}
            </div>
          </div>

          {/* Facial Expressions */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-emerald-400" /> Facial Expression
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {EXPRESSIONS.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => updateProp('faceExpression', exp.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition text-center border ${
                    customization.faceExpression === exp.id
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {exp.name}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl transition transform active:scale-98"
            >
              Save & Rock This Look! 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
