import React from 'react';
import { SoundClip } from '../types';

interface AudioInstance {
  clipId: string;
  baseVolume: number;
  element: HTMLAudioElement;
}

interface ActiveMixerProps {
  playingIds: Set<string>;
  clips: SoundClip[];
  audioInstances: Map<string, AudioInstance>;
  onVolumeChange: (id: string, vol: number) => void;
}

export const ActiveMixer: React.FC<ActiveMixerProps> = ({ 
  playingIds, 
  clips, 
  audioInstances,
  onVolumeChange 
}) => {
  const playingClips = clips.filter(c => playingIds.has(c.id));

  const handleStop = (id: string) => {
      const instance = audioInstances.get(id);
      if (instance) {
          instance.element.pause();
          instance.element.currentTime = 0;
          instance.element.dispatchEvent(new Event('ended'));
      }
  };

  return (
    <div className="w-80 sm:w-96 max-h-[500px] flex flex-col bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <span className="font-bold text-slate-200 text-sm tracking-wide uppercase">Активные звуки</span>
            <span className="text-xs font-mono bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">{playingClips.length} играет</span>
        </div>
        
        <div className="p-2 overflow-y-auto space-y-1 custom-scrollbar flex-1 bg-slate-900">
            {playingClips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                    <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                    <span className="text-sm">Нет активных звуков</span>
                </div>
            ) : (
                playingClips.map(clip => {
                    const instance = audioInstances.get(clip.id);
                    const currentVol = instance ? instance.baseVolume : clip.volume;
                    
                    return (
                        <div key={clip.id} className="group bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-lg border border-slate-700/30 hover:border-slate-600 transition-all duration-200">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: clip.color }}></div>
                                    <span className="font-medium text-slate-200 truncate text-sm" title={clip.name}>{clip.name}</span>
                                </div>
                                <span className="text-xs font-mono text-slate-400 bg-slate-950/30 px-1.5 py-0.5 rounded">{Math.round(currentVol * 100)}%</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Volume Slider */}
                                <div className="relative flex-1 h-6 flex items-center">
                                    <input 
                                        type="range" min="0" max="1" step="0.01"
                                        value={currentVol}
                                        onChange={(e) => onVolumeChange(clip.id, parseFloat(e.target.value))}
                                        className="absolute w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 z-10"
                                    />
                                    {/* Visual Track background (optional enhancement) */}
                                    <div className="w-full h-1.5 bg-slate-700 rounded-lg overflow-hidden absolute pointer-events-none">
                                        <div className="h-full bg-indigo-500/20" style={{ width: `${currentVol * 100}%` }}></div>
                                    </div>
                                </div>
                                
                                {/* Stop Button for individual track */}
                                <button 
                                    onClick={() => handleStop(clip.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                                    title="Остановить"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4h12v12H4z" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};