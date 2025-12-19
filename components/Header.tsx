import React, { useState, useRef, useEffect } from 'react';
import { ActiveMixer } from './ActiveMixer';
import { SoundClip, SoundpadProfile } from '../types';

interface HeaderProps {
  globalVolume: number;
  isEditMode: boolean;
  onVolumeChange: (vol: number) => void;
  onStopAll: () => void;
  onToggleEditMode: () => void;
  
  // Mixer Props
  playingIds: Set<string>;
  clips: SoundClip[];
  audioInstances: any;
  onInstanceVolumeChange: (id: string, vol: number) => void;

  // Import/Export
  onExport: () => void;
  onImportClick: () => void;
  
  // Profile Props
  profiles: SoundpadProfile[];
  currentProfileId: string;
  onSwitchProfile: (id: string) => void;
  
  // Modal Triggers
  onOpenCreateProfile: () => void;
  onOpenDeleteProfile: () => void;
  onOpenDeleteAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  globalVolume, 
  isEditMode, 
  onVolumeChange, 
  onStopAll, 
  onToggleEditMode,
  playingIds,
  clips,
  audioInstances,
  onInstanceVolumeChange,
  onExport,
  onImportClick,
  profiles,
  currentProfileId,
  onSwitchProfile,
  onOpenCreateProfile,
  onOpenDeleteProfile,
  onOpenDeleteAll
}) => {
  const [showMixer, setShowMixer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const mixerRef = useRef<HTMLDivElement>(null);
  const volumeBtnRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (
        mixerRef.current && !mixerRef.current.contains(target) &&
        volumeBtnRef.current && !volumeBtnRef.current.contains(target)
      ) {
        setShowMixer(false);
      }
      
      if (profileRef.current && !profileRef.current.contains(target)) {
          setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-lg select-none">
      <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Logo & Profile Switcher */}
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </div>
          <h1 className="text-xl font-bold text-indigo-400 hidden lg:block mr-2">
            Саундконструктор
          </h1>
          
          {/* Profile Selector */}
          <div className="relative" ref={profileRef}>
              <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors text-sm font-medium"
              >
                  <span className="max-w-[100px] sm:max-w-[150px] truncate">{currentProfile?.name || 'Саундпад'}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {showProfileMenu && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-2 border-b border-slate-800">
                          <span className="text-xs font-bold text-slate-500 uppercase px-2">Профили</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {profiles.map(p => (
                              <button
                                  key={p.id}
                                  onClick={() => { onSwitchProfile(p.id); setShowProfileMenu(false); }}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group ${p.id === currentProfileId ? 'bg-indigo-900/30 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'}`}
                              >
                                  <span className="truncate">{p.name}</span>
                                  {p.id === currentProfileId && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                              </button>
                          ))}
                      </div>
                      <div className="p-2 border-t border-slate-800 bg-slate-900/50 space-y-1">
                          <button 
                              onClick={() => { onOpenCreateProfile(); setShowProfileMenu(false); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                          >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                              Новый профиль
                          </button>
                          {profiles.length > 1 && (
                              <button 
                                  onClick={() => { onOpenDeleteProfile(); setShowProfileMenu(false); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                              >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  Удалить текущий
                              </button>
                          )}
                      </div>
                  </div>
              )}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 md:gap-4">
          
          {/* Global Volume + Mixer Popover */}
          <div className="relative">
             <div 
               ref={volumeBtnRef}
               className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
             >
               <button 
                  onClick={() => setShowMixer(!showMixer)}
                  className={`p-1 rounded-full hover:bg-slate-700 ${playingIds.size > 0 ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`}
                  title="Микшер"
               >
                   {/* Updated Mixer Icon (Sliders) */}
                   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
               </button>
               <input 
                 type="range" min="0" max="1" step="0.05" 
                 value={globalVolume}
                 onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                 className="w-20 md:w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 pointer-events-auto"
               />
             </div>
             
             {/* Mixer Dropdown */}
             {showMixer && (
                 <div ref={mixerRef} className="absolute top-full right-0 mt-2 z-50">
                     <ActiveMixer 
                        playingIds={playingIds}
                        clips={clips}
                        audioInstances={audioInstances}
                        onVolumeChange={onInstanceVolumeChange}
                     />
                 </div>
             )}
          </div>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          {/* Edit Mode Actions */}
          {isEditMode && (
             <div className="flex items-center gap-1">
                <button 
                    onClick={onOpenDeleteAll}
                    className="p-2 text-red-400 hover:text-white hover:bg-red-900/50 rounded-md transition-colors"
                    title="Удалить ВСЕ звуки"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button 
                  onClick={onExport} 
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" 
                  title="Экспорт (JSON)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </button>
                <button 
                  onClick={onImportClick}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md" 
                  title="Импорт"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </button>
             </div>
          )}

          {/* Stop All */}
          <button 
            onClick={onStopAll}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-semibold shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
            title="Остановить всё"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
          </button>

          {/* Edit Mode Toggle */}
            <button
            onClick={onToggleEditMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
              isEditMode 
              ? 'bg-amber-500 text-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            <span className="hidden sm:inline">{isEditMode ? 'Готово' : 'Редактор'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};