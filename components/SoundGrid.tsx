import React, { useState, useRef, useEffect } from 'react';
import { SoundClip, GRID_GAP, ResizeDirection } from '../types';
import { GridTile } from './GridTile';
import { checkCollision, findFirstFreeSpot } from '../utils/collision';
import { generateSmartColor } from '../utils/color';

interface SoundGridProps {
  clips: SoundClip[];
  playingIds: Set<string>;
  isEditMode: boolean;
  gridState: { cellSize: number; columns: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  onPlay: (clip: SoundClip) => void;
  onEdit: (clip: SoundClip) => void;
  onMoveClip: (id: string, x: number, y: number) => void;
  onMoveClips: (updates: {id: string, x: number, y: number}[]) => void;
  onResizeClip: (id: string, cols: number, rows: number) => void;
  onSaveClip: (data: Partial<SoundClip>, file: File | null) => Promise<void>;
  setIsEditMode: (v: boolean) => void;
  setIsAddingNew: (v: boolean) => void;
}

export const SoundGrid = ({
  clips,
  playingIds,
  isEditMode,
  gridState,
  containerRef,
  onPlay,
  onEdit,
  onMoveClip,
  onMoveClips,
  onResizeClip,
  onSaveClip,
  setIsEditMode,
  setIsAddingNew
}: SoundGridProps) => {
  // Selection State
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(new Set());
  
  // Rubber Band State
  const [selectionBox, setSelectionBox] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<{x: number, y: number} | null>(null);
  const initialSelectionRef = useRef<Set<string>>(new Set());

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<{x: number, y: number, w: number, h: number, valid: boolean} | null>(null);
  
  const dragOffsets = useRef<{ id: string, dx: number, dy: number }[]>([]);
  const mouseOffset = useRef({ x: 0, y: 0 });
  const anchorClipId = useRef<string | null>(null);

  useEffect(() => {
    if (!isEditMode) setSelectedClipIds(new Set());
  }, [isEditMode]);

  const handleTileSelect = (e: React.MouseEvent | { ctrlKey: boolean, metaKey: boolean, shiftKey: boolean }, clip: SoundClip) => {
      const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
      setSelectedClipIds(prev => {
          const next = new Set(isMulti ? prev : []);
          if (next.has(clip.id)) {
             if (isMulti) next.delete(clip.id);
             else next.add(clip.id); 
          } else {
             next.add(clip.id);
          }
          return next;
      });
  };

  const getPointerPos = (e: React.PointerEvent) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
          x: e.clientX - rect.left + containerRef.current.scrollLeft,
          y: e.clientY - rect.top + containerRef.current.scrollTop
      };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const isShift = e.shiftKey;
    const isBackground = e.target === e.currentTarget;

    if (!isEditMode) return;
    if (!isBackground && !isShift) return;
    
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;

    isSelectingRef.current = true;
    const pos = getPointerPos(e);
    selectionStartRef.current = pos;
    initialSelectionRef.current = isMulti ? new Set(selectedClipIds) : new Set();
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectionBox({ x: pos.x, y: pos.y, w: 0, h: 0 });

    if (!isMulti) {
        setSelectedClipIds(new Set());
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (isSelectingRef.current && selectionStartRef.current && containerRef.current) {
          const currentPos = getPointerPos(e);
          const startPos = selectionStartRef.current;

          const x = Math.min(currentPos.x, startPos.x);
          const y = Math.min(currentPos.y, startPos.y);
          const w = Math.abs(currentPos.x - startPos.x);
          const h = Math.abs(currentPos.y - startPos.y);
          
          setSelectionBox({ x, y, w, h });

          const PADDING = 32; 
          const totalCell = gridState.cellSize + GRID_GAP;
          const newSelection = new Set(initialSelectionRef.current);

          clips.forEach(clip => {
              const clipPxX = PADDING + (clip.x - 1) * totalCell;
              const clipPxY = PADDING + (clip.y - 1) * totalCell;
              const clipPxW = clip.cols * gridState.cellSize + (clip.cols - 1) * GRID_GAP;
              const clipPxH = clip.rows * gridState.cellSize + (clip.rows - 1) * GRID_GAP;

              const intersects = (
                  x < clipPxX + clipPxW &&
                  x + w > clipPxX &&
                  y < clipPxY + clipPxH &&
                  y + h > clipPxY
              );

              if (intersects) {
                  newSelection.add(clip.id);
              }
          });

          setSelectedClipIds(newSelection);
          return;
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      if (isSelectingRef.current) {
          isSelectingRef.current = false;
          setSelectionBox(null);
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          
          if (selectionStartRef.current) {
              const pos = getPointerPos(e);
              const dist = Math.hypot(pos.x - selectionStartRef.current.x, pos.y - selectionStartRef.current.y);
              
              if (dist < 5) {
                 const PADDING = 32;
                 const totalCell = gridState.cellSize + GRID_GAP;
                 const clickedClip = clips.find(clip => {
                      const clipPxX = PADDING + (clip.x - 1) * totalCell;
                      const clipPxY = PADDING + (clip.y - 1) * totalCell;
                      const clipPxW = clip.cols * gridState.cellSize + (clip.cols - 1) * GRID_GAP;
                      const clipPxH = clip.rows * gridState.cellSize + (clip.rows - 1) * GRID_GAP;
                      return (
                          pos.x >= clipPxX && pos.x <= clipPxX + clipPxW &&
                          pos.y >= clipPxY && pos.y <= clipPxY + clipPxH
                      );
                 });

                 if (clickedClip) {
                     handleTileSelect({ 
                         ctrlKey: e.ctrlKey, 
                         metaKey: e.metaKey, 
                         shiftKey: e.shiftKey 
                     }, clickedClip);
                 } else if (!(e.ctrlKey || e.metaKey || e.shiftKey)) {
                     setSelectedClipIds(new Set());
                 }
              }
          }
          selectionStartRef.current = null;
      }
  };

  const calculateGridPosition = (e: React.DragEvent, offsetX: number, offsetY: number) => {
    if (!containerRef.current) return { colIndex: 1, rowIndex: 1 };
    const gridContainer = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    
    const PADDING = 32;
    const relativeX = e.clientX - gridContainer.left - offsetX - PADDING; 
    const relativeY = e.clientY - gridContainer.top - offsetY + scrollTop - PADDING;

    const { cellSize } = gridState;
    const totalCell = cellSize + GRID_GAP;

    const colIndex = Math.max(1, Math.round(relativeX / totalCell) + 1);
    const rowIndex = Math.max(1, Math.round(relativeY / totalCell) + 1);
    
    return { colIndex, rowIndex };
  };

  const handleDragStart = (e: React.DragEvent, clip: SoundClip) => {
    if (!isEditMode) {
      e.preventDefault();
      return;
    }

    let currentSelection = new Set(selectedClipIds);
    if (!currentSelection.has(clip.id)) {
        currentSelection = new Set([clip.id]);
        setSelectedClipIds(currentSelection);
    }

    setIsDragging(true);
    anchorClipId.current = clip.id;
    
    const offsets: { id: string, dx: number, dy: number }[] = [];
    currentSelection.forEach(id => {
        const c = clips.find(x => x.id === id);
        if (c) {
            offsets.push({
                id: id,
                dx: c.x - clip.x,
                dy: c.y - clip.y
            });
        }
    });
    dragOffsets.current = offsets;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    mouseOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    e.dataTransfer.setData('text/plain', clip.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDropTarget(null);
    anchorClipId.current = null;
    dragOffsets.current = [];
  };

  const handleGridDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.types.includes('Files')) {
       e.dataTransfer.dropEffect = 'copy';
       const { colIndex, rowIndex } = calculateGridPosition(e, 0, 0);
       const hasCollision = checkCollision({x: colIndex, y: rowIndex, w: 1, h: 1}, clips);
       setDropTarget({ x: colIndex, y: rowIndex, w: 1, h: 1, valid: !hasCollision });
       return;
    }

    if (!isEditMode || !isDragging || !anchorClipId.current) return;
    
    e.dataTransfer.dropEffect = 'move';
    
    let { colIndex, rowIndex } = calculateGridPosition(e, mouseOffset.current.x, mouseOffset.current.y);

    let minDx = 0;
    let minDy = 0;
    
    dragOffsets.current.forEach(offset => {
        if (offset.dx < minDx) minDx = offset.dx;
        if (offset.dy < minDy) minDy = offset.dy;
    });

    colIndex = Math.max(1 - minDx, colIndex);
    rowIndex = Math.max(1 - minDy, rowIndex);
    
    let allValid = true;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    const projectedPositions = dragOffsets.current.map(offset => {
        const c = clips.find(x => x.id === offset.id);
        if (!c) return null;
        
        const newX = Math.max(1, colIndex + offset.dx);
        const newY = Math.max(1, rowIndex + offset.dy);
        
        minX = Math.min(minX, newX);
        minY = Math.min(minY, newY);
        maxX = Math.max(maxX, newX + c.cols);
        maxY = Math.max(maxY, newY + c.rows);

        return { x: newX, y: newY, w: c.cols, h: c.rows, id: offset.id };
    }).filter(Boolean) as {x: number, y: number, w: number, h: number, id: string}[];

    for (const pos of projectedPositions) {
        const collision = clips.some(existing => {
            if (selectedClipIds.has(existing.id)) return false; 
            return (
                 pos.x < existing.x + existing.cols &&
                 pos.x + pos.w > existing.x &&
                 pos.y < existing.y + existing.rows &&
                 pos.y + pos.h > existing.y
            );
        });
        if (collision) {
            allValid = false;
            break;
        }
    }

    setDropTarget({
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        valid: allValid
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDropTarget(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'));
      let { colIndex, rowIndex } = calculateGridPosition(e, 0, 0);
      const tempClips = [...clips];

      for (const file of files) {
         if (checkCollision({x: colIndex, y: rowIndex, w: 1, h: 1}, tempClips)) {
            const free = findFirstFreeSpot(1, 1, tempClips, gridState.columns);
            colIndex = free.x;
            rowIndex = free.y;
         }
         const name = file.name.replace(/\.[^/.]+$/, "");
         const color = generateSmartColor(name, tempClips);
         const newClipPartial = {
            name, x: colIndex, y: rowIndex, cols: 1, rows: 1, color, fadeInOut: true, volume: 1, isLooping: true
         };
         await onSaveClip(newClipPartial, file);
         tempClips.push({ ...newClipPartial, id: 'temp-' + Math.random() } as SoundClip);
      }
      return;
    }

    if (!isEditMode || !anchorClipId.current) return;

    let { colIndex, rowIndex } = calculateGridPosition(e, mouseOffset.current.x, mouseOffset.current.y);
    
    let minDx = 0;
    let minDy = 0;
    dragOffsets.current.forEach(offset => {
        if (offset.dx < minDx) minDx = offset.dx;
        if (offset.dy < minDy) minDy = offset.dy;
    });
    colIndex = Math.max(1 - minDx, colIndex);
    rowIndex = Math.max(1 - minDy, rowIndex);

    let allValid = true;
    const updates: { id: string, x: number, y: number }[] = [];

    const projectedPositions = dragOffsets.current.map(offset => {
        const c = clips.find(x => x.id === offset.id);
        if (!c) return null;
        const newX = Math.max(1, colIndex + offset.dx);
        const newY = Math.max(1, rowIndex + offset.dy);
        return { x: newX, y: newY, w: c.cols, h: c.rows, id: offset.id };
    }).filter(Boolean) as {x: number, y: number, w: number, h: number, id: string}[];

    for (const pos of projectedPositions) {
        const collision = clips.some(existing => {
            if (selectedClipIds.has(existing.id)) return false; 
            return (
                 pos.x < existing.x + existing.cols &&
                 pos.x + pos.w > existing.x &&
                 pos.y < existing.y + existing.rows &&
                 pos.y + pos.h > existing.y
            );
        });
        if (collision) {
            allValid = false;
            break;
        }
        updates.push({ id: pos.id, x: pos.x, y: pos.y });
    }

    if (allValid && updates.length > 0) {
        onMoveClips(updates);
    }
    
    anchorClipId.current = null;
    dragOffsets.current = [];
  };

  const handleTileResize = (clip: SoundClip, dir: ResizeDirection, dx: number, dy: number) => {
    const { cellSize } = gridState;
    const totalCell = cellSize + GRID_GAP;
    const colSteps = Math.round(dx / totalCell);
    const rowSteps = Math.round(dy / totalCell);
    if (colSteps === 0 && rowSteps === 0) return;

    let { x, y, cols, rows } = clip;
    let newX = x, newY = y, newCols = cols, newRows = rows;

    if (dir.includes('e')) newCols = Math.max(1, cols + colSteps);
    else if (dir.includes('w')) {
        if (x + colSteps >= 1) { newX = x + colSteps; newCols = cols - colSteps; }
    }
    if (dir.includes('s')) newRows = Math.max(1, rows + rowSteps);
    else if (dir.includes('n')) {
        if (y + rowSteps >= 1) { newY = y + rowSteps; newRows = rows - rowSteps; }
    }
    newCols = Math.max(1, newCols);
    newRows = Math.max(1, newRows);

    if (!checkCollision({x: newX, y: newY, w: newCols, h: newRows}, clips, clip.id)) {
        if (newX !== x || newY !== y) onMoveClip(clip.id, newX, newY);
        if (newCols !== cols || newRows !== rows) onResizeClip(clip.id, newCols, newRows);
    }
  };

  return (
    <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative flex-1 overflow-auto rounded-xl border-2 border-transparent transition-colors duration-300 p-8 touch-none"
        style={{
            borderColor: isDragging || (isEditMode && dropTarget) ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
            userSelect: 'none',
        }}
        onDragOver={handleGridDragOver}
        onDrop={handleDrop}
    >
        <div
        style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridState.columns}, ${gridState.cellSize}px)`, 
            gridAutoRows: `${gridState.cellSize}px`,
            gap: `${GRID_GAP}px`,
            paddingBottom: '200px', 
            width: `${gridState.columns * (gridState.cellSize + GRID_GAP) - GRID_GAP}px`,
            backgroundImage: (isDragging || isEditMode) 
            ? `
            linear-gradient(to right, rgba(255,255,255,0.03) ${gridState.cellSize}px, transparent ${gridState.cellSize}px), 
            linear-gradient(to bottom, rgba(255,255,255,0.03) ${gridState.cellSize}px, transparent ${gridState.cellSize}px)
            `
            : 'none',
            backgroundSize: `${gridState.cellSize + GRID_GAP}px ${gridState.cellSize + GRID_GAP}px`,
        }}
        >
        
        {selectionBox && (
            <div 
                className="fixed border border-indigo-400 bg-indigo-500/20 z-50 pointer-events-none"
                style={{
                    position: 'absolute',
                    left: selectionBox.x,
                    top: selectionBox.y,
                    width: selectionBox.w,
                    height: selectionBox.h,
                }}
            />
        )}

        {dropTarget && (
            <div 
            className={`rounded-xl border-2 border-dashed z-0 transition-all duration-75 ${dropTarget.valid ? 'border-indigo-400 bg-indigo-500/20' : 'border-red-500 bg-red-500/20'}`}
            style={{
                gridColumnStart: dropTarget.x,
                gridColumnEnd: `span ${dropTarget.w}`,
                gridRowStart: dropTarget.y,
                gridRowEnd: `span ${dropTarget.h}`,
            }}
            />
        )}

        {clips.map((clip) => (
            <GridTile 
                key={clip.id} 
                clip={clip} 
                isPlaying={playingIds.has(clip.id)} 
                isEditMode={isEditMode}
                isSelected={selectedClipIds.has(clip.id)}
                onPlay={onPlay} 
                onEdit={onEdit} 
                onSelect={handleTileSelect}
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd} 
                onResize={handleTileResize}
            />
        ))}
        </div>
        {clips.length === 0 && !isEditMode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-slate-500 pointer-events-auto max-w-md p-6 border-2 border-dashed border-slate-800 rounded-xl">
                <p className="text-xl font-medium mb-2">Саундпад пуст</p>
                <p className="text-sm text-slate-400 mb-6">Перетащите сюда аудиофайлы.</p>
                <button onClick={() => { setIsEditMode(true); setIsAddingNew(true); }} className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 font-medium">Настроить</button>
                </div>
            </div>
        )}
    </div>
  );
};