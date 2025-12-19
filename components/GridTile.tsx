import React, { useRef, useMemo } from 'react';
import { SoundClip, ResizeDirection } from '../types';
import { isLightColor } from '../utils/color';

interface GridTileProps {
  clip: SoundClip;
  isPlaying: boolean;
  isEditMode: boolean;
  isSelected: boolean;
  onPlay: (clip: SoundClip) => void;
  onEdit: (clip: SoundClip) => void;
  onSelect: (e: React.MouseEvent, clip: SoundClip) => void;
  onDragStart: (e: React.DragEvent, clip: SoundClip) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onResize: (clip: SoundClip, dir: ResizeDirection, dx: number, dy: number) => void;
}

export const GridTile: React.FC<GridTileProps> = ({ 
  clip, 
  isPlaying, 
  isEditMode, 
  isSelected,
  onPlay, 
  onEdit,
  onSelect,
  onDragStart,
  onDragEnd,
  onResize 
}) => {
  const resizeStartPos = useRef<{x: number, y: number} | null>(null);

  const handleResizePointerDown = (e: React.PointerEvent, dir: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    
    const handleMove = (ev: PointerEvent) => {
       if (!resizeStartPos.current) return;
       const dx = ev.clientX - resizeStartPos.current.x;
       const dy = ev.clientY - resizeStartPos.current.y;
       onResize(clip, dir, dx, dy);
    };

    const handleUp = (ev: PointerEvent) => {
       resizeStartPos.current = null;
       target.releasePointerCapture(ev.pointerId);
       target.removeEventListener('pointermove', handleMove);
       target.removeEventListener('pointerup', handleUp);
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
  };

  const fontSize = useMemo(() => {
    const length = clip.name.length;
    const baseSize = Math.min(clip.cols, clip.rows) * 1.2; 
    const lengthFactor = Math.max(0.6, 1 - (length / 25));
    return `${Math.max(0.7, baseSize * lengthFactor)}rem`;
  }, [clip.cols, clip.rows, clip.name]);

  const isLight = useMemo(() => isLightColor(clip.color), [clip.color]);
  const hasAudio = !!clip.blobId;

  return (
    <div
      draggable={isEditMode}
      onDragStart={(e) => {
        if (e.shiftKey) {
            e.preventDefault();
            return;
        }
        onDragStart(e, clip);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
          if (isEditMode) {
              e.stopPropagation();
              onSelect(e, clip);
          } else if (hasAudio) {
              onPlay(clip);
          }
      }}
      className={`
        relative rounded-lg overflow-hidden transition-all duration-200 ease-out
        ${isPlaying ? 'z-20 brightness-110 shadow-xl' : 'shadow-md hover:brightness-105'}
        ${isEditMode ? 'cursor-move' : hasAudio ? 'cursor-pointer active:scale-95' : 'cursor-default'}
      `}
      style={{
        gridColumnStart: clip.x,
        gridColumnEnd: `span ${clip.cols || 1}`,
        gridRowStart: clip.y,
        gridRowEnd: `span ${clip.rows || 1}`,
        backgroundColor: clip.color, 
        border: isSelected 
            ? '3px solid white' 
            : (hasAudio ? 'none' : '2px dashed rgba(255,255,255,0.3)'),
        boxShadow: isPlaying 
            ? `0 0 15px 2px ${clip.color}` 
            : (isSelected ? '0 0 10px rgba(255,255,255,0.3)' : undefined),
        zIndex: isSelected ? 30 : 10
      }}
    >
      <div className="w-full h-full flex items-center justify-center p-2 text-center pointer-events-none">
        <span 
          className={`font-bold leading-tight break-words w-full ${isLight ? '' : 'drop-shadow-md'}`}
          style={{ 
            fontSize, 
            opacity: hasAudio ? 1 : 0.7,
            color: isLight ? '#020617' : '#ffffff'
          }}
        >
          {clip.name}
        </span>
      </div>

      {isEditMode && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(clip); }}
            className={`absolute top-1 right-1 p-1 rounded-full transition-colors z-40 pointer-events-auto ${isLight ? 'bg-black/10 hover:bg-black/30 text-black/80' : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white'}`}
          >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          
          <div className="absolute top-0 left-2 right-2 h-2 cursor-n-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'n')} />
          <div className="absolute bottom-0 left-2 right-2 h-2 cursor-s-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 's')} />
          <div className="absolute left-0 top-2 bottom-2 w-2 cursor-w-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'w')} />
          <div className="absolute right-0 top-2 bottom-2 w-2 cursor-e-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'e')} />
          
          <div className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'nw')} />
          <div className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'ne')} />
          <div className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-30 pointer-events-auto" onPointerDown={(e) => handleResizePointerDown(e, 'sw')} />
          
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-0.5 hover:bg-black/20 rounded-tl-lg z-30 pointer-events-auto"
            onPointerDown={(e) => handleResizePointerDown(e, 'se')}
          >
            <svg width="8" height="8" viewBox="0 0 10 10" fill={isLight ? "black" : "white"} className="opacity-70 pointer-events-none">
                <path d="M10 10L10 0L0 10L10 10Z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};