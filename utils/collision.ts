import { SoundClip } from '../types';

export const isOverlapping = (r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) => {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
};

export const checkCollision = (target: {x:number, y:number, w:number, h:number}, clips: SoundClip[], ignoredId?: string) => {
  return clips.some(c => {
    if (c.id === ignoredId) return false;
    return isOverlapping(target, {x: c.x, y: c.y, w: c.cols, h: c.rows});
  });
};

export const findFirstFreeSpot = (w: number, h: number, clips: SoundClip[], maxColumns: number) => {
  const MAX_ROWS = 200;
  for (let y = 1; y < MAX_ROWS; y++) {
    for (let x = 1; x <= maxColumns - w + 1; x++) {
      if (!checkCollision({x, y, w, h}, clips)) {
        return {x, y};
      }
    }
  }
  return {x: 1, y: 1};
};