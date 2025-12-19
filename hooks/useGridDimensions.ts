import { useState, useLayoutEffect, useRef } from 'react';
import { GRID_GAP, MIN_TILE_SIZE } from '../types';

export const useGridDimensions = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridState, setGridState] = useState({ cellSize: MIN_TILE_SIZE, columns: 12 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            // contentRect.width gives the width inside the padding
            const availableWidth = entry.contentRect.width;
            
            if (availableWidth <= 0) continue;

            const estimatedCols = Math.floor((availableWidth + GRID_GAP) / (MIN_TILE_SIZE + GRID_GAP));
            const columns = Math.max(4, Math.min(24, estimatedCols));
            
            // Calculate cell size to fill available space
            const cellSize = Math.floor((availableWidth - (columns - 1) * GRID_GAP) / columns);

            // Only update if changed to prevent render loops
            setGridState(prev => {
                if (prev.cellSize === cellSize && prev.columns === columns) return prev;
                return { cellSize, columns };
            });
        }
    });

    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  return { containerRef, gridState };
};