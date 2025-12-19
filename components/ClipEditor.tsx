import React, { useState, useEffect } from 'react';
import { SoundClip } from '../types';
import { generateSmartColor, hexToRgb, rgbToHex } from '../utils/color';

interface ClipEditorProps {
  clip?: SoundClip; 
  allClips: SoundClip[];
  onSave: (data: Partial<SoundClip>, file: File | null) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export const ClipEditor: React.FC<ClipEditorProps> = ({ clip, allClips, onSave, onDelete, onClose }) => {
  const [name, setName] = useState(clip?.name || '');
  const [volume, setVolume] = useState(clip?.volume ?? 1);
  const [fadeInOut, setFadeInOut] = useState(clip?.fadeInOut ?? true);
  const [isLooping, setIsLooping] = useState(clip?.isLooping ?? true);
  const [color, setColor] = useState(clip?.color || '#4f46e5');
  const [rgb, setRgb] = useState({ r: 79, g: 70, b: 229 }); // Default indigo
  const [file, setFile] = useState<File | null>(null);

  // Initialize color
  useEffect(() => {
    if (!clip && !color) {
      const newColor = generateSmartColor('', allClips);
      setColor(newColor);
      setRgb(hexToRgb(newColor));
    } else if (clip) {
        setRgb(hexToRgb(clip.color));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!name) {
        const fileName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
        setName(fileName);
        if (!clip) { 
            const newColor = generateSmartColor(fileName, allClips);
            setColor(newColor);
            setRgb(hexToRgb(newColor));
        }
      }
    }
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setColor(val);
      setRgb(hexToRgb(val));
  };

  const handleRgbChange = (k: 'r' | 'g' | 'b', val: string) => {
      const num = Math.min(255, Math.max(0, parseInt(val) || 0));
      const newRgb = { ...rgb, [k]: num };
      setRgb(newRgb);
      setColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleRandomizeColor = () => {
    const randomHex = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    setColor(randomHex);
    setRgb(hexToRgb(randomHex));
  };

  const handleResetColor = () => {
    const newColor = generateSmartColor(name || 'Unnamed', allClips);
    setColor(newColor);
    setRgb(hexToRgb(newColor));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    onSave({
      name,
      volume,
      fadeInOut,
      isLooping,
      color
    }, file);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Например: Вступление, Эффект 1"
          required
          autoFocus
        />
      </div>

      {/* File Input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Аудиофайл (Опционально)</label>
        <div className="relative border-2 border-dashed border-slate-600 rounded-lg p-6 hover:bg-slate-800/50 transition-colors text-center cursor-pointer group">
           <input 
            type="file" 
            accept="audio/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <svg className="mx-auto h-8 w-8 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <div className="text-sm text-slate-400">
              {file ? (
                <span className="text-indigo-400 font-semibold">{file.name}</span>
              ) : (
                <span>{clip?.blobId ? 'Файл загружен (Нажмите для замены)' : 'Нажмите для загрузки (или оставьте пустым)'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Цвет</label>
        <div className="flex flex-wrap items-center gap-4 bg-slate-800/30 p-3 rounded-lg border border-slate-700">
            {/* Hex / Picker */}
            <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded overflow-hidden border border-slate-600 shadow-sm cursor-pointer shrink-0">
                    <input 
                        type="color" 
                        value={color}
                        onChange={handleHexChange}
                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                    />
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Hex</span>
                    <span className="text-sm font-mono text-slate-300">{color}</span>
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700"></div>

            {/* RGB Inputs */}
            <div className="flex items-center gap-2">
                <div className="flex flex-col w-12">
                   <label className="text-[10px] text-slate-500 text-center mb-0.5">R</label>
                   <input type="number" min="0" max="255" value={rgb.r} onChange={(e) => handleRgbChange('r', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col w-12">
                   <label className="text-[10px] text-slate-500 text-center mb-0.5">G</label>
                   <input type="number" min="0" max="255" value={rgb.g} onChange={(e) => handleRgbChange('g', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex flex-col w-12">
                   <label className="text-[10px] text-slate-500 text-center mb-0.5">B</label>
                   <input type="number" min="0" max="255" value={rgb.b} onChange={(e) => handleRgbChange('b', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:border-indigo-500" />
                </div>
            </div>

            <div className="w-full sm:w-auto flex gap-2 sm:ml-auto">
                <button 
                    type="button"
                    onClick={handleRandomizeColor}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700 transition-colors"
                >
                    Случайно
                </button>
                <button 
                    type="button"
                    onClick={handleResetColor}
                    className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300 border border-slate-700 transition-colors"
                >
                    Авто
                </button>
            </div>
        </div>
      </div>

      {/* Individual Volume */}
      <div>
        <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-slate-300">Громкость клипа</label>
            <span className="text-xs text-slate-500">{Math.round(volume * 100)}%</span>
        </div>
        <input 
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
             <label className="flex items-center space-x-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={isLooping}
                onChange={(e) => setIsLooping(e.target.checked)}
                className="form-checkbox h-4 w-4 text-indigo-600 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">Повтор (Loop)</span>
            </label>
         </div>

         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
             <label className="flex items-center space-x-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={fadeInOut}
                onChange={(e) => setFadeInOut(e.target.checked)}
                className="form-checkbox h-4 w-4 text-indigo-600 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-300 group-hover:text-white">Плавный старт (Fade)</span>
            </label>
         </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-slate-700">
        {clip && onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(clip.id)}
            className="px-4 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-md transition-colors text-sm font-medium"
          >
            Удалить
          </button>
        ) : (
          <div></div> // Spacer
        )}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors text-sm font-medium"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-lg shadow-indigo-900/20 transition-all transform hover:scale-105 font-medium"
          >
            Сохранить
          </button>
        </div>
      </div>
    </form>
  );
};