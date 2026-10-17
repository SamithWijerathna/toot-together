import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PlayerCustomization } from '../../types/game';
import { CharacterMesh } from '../../game/character/CharacterMesh';
import { Check, Sparkles, Smile, Palette, HardHat, Shirt } from 'lucide-react';
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

export const ACCESSORY_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'hats', name: 'Hats' },
  { id: 'face', name: 'Face & Glasses' },
  { id: 'outfits', name: 'Outfits & Gear' },
  { id: 'shoes', name: 'Pants & Shoes' },
] as const;

export const ACCESSORIES = [
  // Hats & Headwear
  { id: 'none', name: 'No Hat', category: 'hats', icon: '🧢' },
  { id: 'cap', name: 'Baseball Cap', category: 'hats', icon: '🧢' },
  { id: 'party', name: 'Party Cone', category: 'hats', icon: '🎉' },
  { id: 'horns', name: 'Viking Horns', category: 'hats', icon: '😈' },
  { id: 'headphones', name: 'DJ Headphones', category: 'hats', icon: '🎧' },
  { id: 'wavy_hair', name: 'Wavy Hairstyle', category: 'hats', icon: '💇' },

  // Face & Glasses
  { id: 'sunglasses', name: 'Cool Shades', category: 'face', icon: '🕶️' },
  { id: 'glasses', name: 'Square Glasses', category: 'face', icon: '👓' },
  { id: 'moustache', name: 'Gentleman Stache', category: 'face', icon: '🥸' },
  { id: 'moustache2', name: 'Bushy Stache', category: 'face', icon: '🧔' },
  { id: 'clown', name: 'Clown Nose', category: 'face', icon: '🤡' },
  { id: 'pacifier', name: 'Baby Pacifier', category: 'face', icon: '👶' },

  // Outfits & Gear
  { id: 'jacket', name: 'Sport Jacket', category: 'outfits', icon: '🧥' },
  { id: 'vest', name: 'Winter Vest', category: 'outfits', icon: '🦺' },
  { id: 'costume_hero', name: 'Hero Costume', category: 'outfits', icon: '🦸' },
  { id: 'costume_racer', name: 'Racer Suit', category: 'outfits', icon: '🏎️' },
  { id: 'gloves', name: 'Biker Gloves', category: 'outfits', icon: '🧤' },
  { id: 'mittens', name: 'Cozy Mittens', category: 'outfits', icon: '🧤' },

  // Pants & Shoes
  { id: 'shorts', name: 'Summer Shorts', category: 'shoes', icon: '🩳' },
  { id: 'cargo', name: 'Cargo Pants', category: 'shoes', icon: '👖' },
  { id: 'slippers', name: 'House Slippers', category: 'shoes', icon: '🩴' },
  { id: 'monster_slippers', name: 'Monster Slippers', category: 'shoes', icon: '🐾' },
];

const EXPRESSIONS: Array<{ id: PlayerCustomization['faceExpression']; name: string }> = [
  { id: 'happy', name: 'Happy 😊' },
  { id: 'silly', name: 'Goofy 🤪' },
  { id: 'shocked', name: 'Shocked 😲' },
  { id: 'cool', name: 'Cool 😎' },
  { id: 'dizzy', name: 'Angry 😠' },
];

export const CharacterCustomizer: React.FC<Props> = ({ customization, onChange, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshRef = useRef<CharacterMesh | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeAnim, setActiveAnim] = useState<string>('idle');
  const isDraggingRef = useRef(false);
  const prevMouseXRef = useRef(0);

  // 3D Preview Setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);

    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    camera.position.set(0, 0.9, 2.5);
    camera.lookAt(0, 0.72, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
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

      // Slow showcase rotation when user is not manually rotating
      if (!isDraggingRef.current) {
        character.root.rotation.y += delta * 0.5;
      }

      character.animate(delta, false, false, true, false, null);
      renderer.render(scene, camera);
    };
    render();

    // Mouse drag to rotate
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseXRef.current = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseXRef.current;
      prevMouseXRef.current = e.clientX;
      character.root.rotation.y += dx * 0.015;
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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

  const triggerAnimation = (animName: string) => {
    soundManager.playBounce();
    setActiveAnim(animName);
    if (meshRef.current) {
      meshRef.current.playAction(animName, 0.2);
    }
  };

  const filteredAccessories =
    selectedCategory === 'all'
      ? ACCESSORIES
      : ACCESSORIES.filter((a) => a.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Left Side: 3D Live Interactive Avatar */}
        <div className="relative w-full md:w-5/12 bg-gradient-to-b from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-slate-700/60">
          <div className="text-center mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> 3D Character Mirror
            </span>
            <h3 className="text-xl font-extrabold text-white mt-1">{customization.name || 'Toot Buddy'}</h3>
          </div>

          <div className="w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-inner border border-slate-700 bg-slate-900/60 relative cursor-grab active:cursor-grabbing">
            <canvas ref={canvasRef} className="w-full h-full block" />
            <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-slate-400 select-none bg-slate-900/80 mx-4 py-0.5 rounded-full">
              Drag to rotate 3D view
            </div>
          </div>

          {/* Test Emote buttons */}
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            <button
              onClick={() => triggerAnimation('idle')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                activeAnim === 'idle'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🧘 Idle
            </button>
            <button
              onClick={() => triggerAnimation('run')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                activeAnim === 'run'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🏃 Run
            </button>
            <button
              onClick={() => triggerAnimation('dance')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                activeAnim === 'dance'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🤸 Roll
            </button>
            <button
              onClick={() => triggerAnimation('taunt')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                activeAnim === 'taunt'
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🥊 Punch
            </button>
          </div>
        </div>

        {/* Right Side: Customization Controls */}
        <div className="w-full md:w-7/12 p-6 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <Palette className="w-6 h-6 text-emerald-400" /> Buddy Wardrobe
            </h2>
            <p className="text-sm text-slate-400">Customize your 3D character with authentic outfits, hats, and colors.</p>
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

          {/* Shirt Color Palette */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-emerald-400" /> Shirt Color (Primary)
            </label>
            <div className="grid grid-cols-5 gap-2.5">
              {BODY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateProp('color', c.hex)}
                  className={`h-10 rounded-xl flex items-center justify-center transition transform active:scale-95 shadow-md relative ${
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

          {/* Pants Color Palette */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Pants Accent Color (Secondary)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {BELLY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => updateProp('secondaryColor', c.hex)}
                  className={`h-8 rounded-xl flex items-center justify-center transition ${
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

          {/* 3D Hats, Accessories & Outfits */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-emerald-400" /> 3D Accessories & Outfits
              </label>
              <span className="text-[11px] font-semibold text-emerald-400">
                {ACCESSORIES.find((a) => a.id === customization.accessory)?.name || 'Default'}
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
              {ACCESSORY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Accessory Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredAccessories.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => updateProp('accessory', acc.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition text-left border flex items-center gap-2 ${
                    customization.accessory === acc.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="text-base select-none">{acc.icon}</span>
                  <span className="truncate">{acc.name}</span>
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
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-1 ring-purple-400'
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
