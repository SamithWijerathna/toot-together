import React, { useEffect, useState } from 'react';
import { GameMode, MapId } from '../../types/game';
import { MAP_METADATA } from '../../game/maps/MapDefinitions';
import { RefreshCw, Users, Globe, ArrowRight, X } from 'lucide-react';
import { soundManager } from '../../audio/SoundManager';

interface PublicRoom {
  code: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  mapId: MapId;
  mode: GameMode;
  status: string;
}

interface Props {
  onJoinRoom: (code: string) => void;
  onClose: () => void;
}

export const RoomBrowserModal: React.FC<Props> = ({ onJoinRoom, onClose }) => {
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    soundManager.playClick();
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch {
      // offline fallback
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-cyan-500/40 rounded-3xl shadow-2xl p-6 text-white max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Public Lobby Browser</h2>
              <p className="text-xs text-slate-400">Join active matches or games hosted by friends across the globe.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRooms}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {rooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-3">
              <div className="text-4xl">🏝️</div>
              <p className="font-bold text-slate-400">No public lobbies right now!</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Be the first hero to create a room and invite your friends using your custom room code.
              </p>
            </div>
          ) : (
            rooms.map((r) => {
              const mapMeta = MAP_METADATA[r.mapId];
              return (
                <div
                  key={r.code}
                  className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-cyan-400/50 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-base">{r.name}</h4>
                      <span className="px-2 py-0.5 rounded-md bg-slate-700 text-cyan-300 font-mono text-xs font-bold">
                        {r.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span
                        className="px-2 py-0.5 rounded-md font-semibold text-slate-900 text-[11px]"
                        style={{ backgroundColor: mapMeta?.previewColor || '#38bdf8' }}
                      >
                        {mapMeta?.name || r.mapId}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{r.mode.replace('-', ' ')}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Users className="w-3.5 h-3.5" /> {r.playerCount}/{r.maxPlayers}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundManager.playClick();
                      onJoinRoom(r.code);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-md transition transform active:scale-95"
                  >
                    Join <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
