export interface SoundClip {
  id: string;
  name: string;
  fileName?: string; // Original filename for restoring backups
  color: string; // Hex Code
  volume: number; // 0 to 1 (Individual clip volume)
  blobId?: string; // Reference to IndexedDB key (Optional now)
  
  // Grid properties
  x: number; // Grid Column Start (1-based)
  y: number; // Grid Row Start (1-based)
  cols: number; // Width
  rows: number; // Height
  
  // Audio properties
  fadeInOut: boolean;
  isLooping: boolean; 
}

export interface SoundpadProfile {
  id: string;
  name: string;
  clips: SoundClip[];
}

export interface AppData {
  // Legacy support field (optional)
  clips?: SoundClip[]; 
  
  // New Structure
  currentProfileId: string;
  profiles: SoundpadProfile[];
}

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// Minimal Grid constants - Width/Height are now dynamic
export const GRID_GAP = 8;
export const MIN_TILE_SIZE = 70; // Smaller default tiles