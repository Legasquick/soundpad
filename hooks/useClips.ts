import { useState, useEffect, useCallback } from 'react';
import { SoundClip, SoundpadProfile } from '../types';
import * as DB from '../services/db';
import { generateSmartColor, parseName, deriveColorFromLeader } from '../utils/color';

// Safe ID generator (Zero dependencies)
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

const DEFAULT_PROFILE_ID = 'default';

export const useClips = () => {
  const [profiles, setProfiles] = useState<SoundpadProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>(DEFAULT_PROFILE_ID);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to get current clips safely
  const getCurrentClips = () => {
      return profiles.find(p => p.id === currentProfileId)?.clips || [];
  };
  const clips = getCurrentClips();

  // Helper to update state
  const setClips = useCallback((action: (prevClips: SoundClip[]) => SoundClip[]) => {
      setProfiles(prevProfiles => {
          return prevProfiles.map(p => {
              if (p.id === currentProfileId) {
                  return { ...p, clips: action(p.clips) };
              }
              return p;
          });
      });
  }, [currentProfileId]);

  // Initial Load
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Fallback data if DB fails
        const fallbackData = [{ id: DEFAULT_PROFILE_ID, name: 'Основной', clips: [] }];

        // Timeout promise: if DB takes > 2s, we give up and show empty state
        const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 2000)
        );

        const metadata = await Promise.race([DB.getMetadata(), timeoutPromise]);
        
        if (!mounted) return;

        if (metadata && metadata.profiles && metadata.profiles.length > 0) {
            setProfiles(metadata.profiles);
            setCurrentProfileId(metadata.currentProfileId || metadata.profiles[0].id);
        } else if (metadata && metadata.clips) {
             // Migration logic for old data
             const legacyClips = metadata.clips.map((c, i) => ({
                 ...c,
                 x: c.x ?? (i % 6) + 1,
                 y: c.y ?? Math.floor(i / 6) + 1,
                 color: (c.color && c.color.startsWith('#')) ? c.color : generateSmartColor(c.name)
             }));
             
             setProfiles([{ id: DEFAULT_PROFILE_ID, name: 'Основной', clips: legacyClips }]);
             setCurrentProfileId(DEFAULT_PROFILE_ID);
        } else {
            // New user or timeout
            setProfiles(fallbackData);
            setCurrentProfileId(DEFAULT_PROFILE_ID);
        }
      } catch (e) {
        console.warn("App Load Warning:", e);
        if (mounted) {
            setProfiles([{ id: DEFAULT_PROFILE_ID, name: 'Основной', clips: [] }]);
            setCurrentProfileId(DEFAULT_PROFILE_ID);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  // Persistence
  useEffect(() => {
    if (!isLoading && profiles.length > 0) {
      DB.saveMetadata({ currentProfileId, profiles }).catch(err => console.error("Auto-save error", err));
    }
  }, [profiles, currentProfileId, isLoading]);

  // --- Actions ---

  const createProfile = (name: string) => {
      const newId = generateId();
      setProfiles(prev => [...prev, { id: newId, name, clips: [] }]);
      setCurrentProfileId(newId);
  };

  const switchProfile = (id: string) => {
      setProfiles(prev => {
          if (prev.find(p => p.id === id)) {
              setCurrentProfileId(id);
          }
          return prev;
      });
  };

  const deleteProfile = async (id: string) => {
      if (profiles.length <= 1) {
          alert("Нельзя удалить единственный профиль.");
          return;
      }
      
      const profile = profiles.find(p => p.id === id);
      if (profile) {
          // Fire and forget file cleanup
          Promise.all(profile.clips.map(c => c.blobId ? DB.deleteFile(c.blobId) : Promise.resolve()))
            .catch(console.error);
      }

      setProfiles(prev => prev.filter(p => p.id !== id));
      
      // If we deleted current, switch to first available
      if (currentProfileId === id) {
          setProfiles(prev => {
              if (prev.length > 0) setCurrentProfileId(prev[0].id);
              return prev;
          });
      }
  };
  
  const renameProfile = (id: string, newName: string) => {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const saveClip = async (
    data: Partial<SoundClip>, 
    file: File | null, 
    existingClipId?: string
  ) => {
    try {
      let blobId: string | undefined;
      const currentClips = getCurrentClips();
      const existingClip = currentClips.find(c => c.id === existingClipId);

      if (existingClip) blobId = existingClip.blobId;

      if (file) {
        blobId = generateId();
        await DB.saveFile(blobId, file);
      }

      const nameToCheck = data.name || existingClip?.name || 'Unnamed';
      let smartColor = data.color;
      
      if (!smartColor) {
           smartColor = existingClip?.color || generateSmartColor(nameToCheck, currentClips);
      }

      // Group coloring logic
      const parsed = parseName(nameToCheck);
      let updatedFollowers: {id: string, color: string}[] = [];

      if (parsed.number === 1 && smartColor) {
          const baseNameLower = parsed.baseName.toLowerCase();
          updatedFollowers = currentClips
            .filter(c => c.id !== existingClipId) 
            .filter(c => {
                const p = parseName(c.name);
                return p.baseName.toLowerCase() === baseNameLower && p.number > 1;
            })
            .map(follower => ({
                id: follower.id,
                color: deriveColorFromLeader(smartColor!, parseName(follower.name).number)
            }));
      }

      setClips(prev => {
          if (existingClip) {
             return prev.map(c => {
               if (c.id === existingClipId) {
                   return { 
                        ...c, 
                        ...data, 
                        blobId, 
                        fileName: file ? file.name : c.fileName,
                        color: smartColor! 
                   };
               }
               const follower = updatedFollowers.find(uf => uf.id === c.id);
               return follower ? { ...c, color: follower.color } : c;
             });
          } else {
            // New Clip Position
            let startX = 1;
            let startY = 1;
            if (prev.length > 0 && (!data.x || !data.y)) {
                const maxY = Math.max(0, ...prev.map(c => c.y + c.rows));
                startY = maxY || 1; 
            }

            const newClip: SoundClip = {
              id: generateId(),
              name: data.name || 'Без названия',
              fileName: file ? file.name : undefined,
              color: smartColor!,
              volume: data.volume ?? 1,
              blobId,
              cols: data.cols || 1,
              rows: data.rows || 1,
              x: data.x || startX,
              y: data.y || startY,
              fadeInOut: data.fadeInOut ?? true,
              isLooping: data.isLooping ?? true,
            };
            return [...prev, newClip];
          }
      });
    } catch (e) {
      console.error("Error saving clip", e);
      alert("Ошибка при сохранении. Возможно, закончилось место в браузере.");
    }
  };

  const deleteClip = (id: string) => {
    const clip = clips.find(c => c.id === id);
    if (clip?.blobId) DB.deleteFile(clip.blobId).catch(console.error);
    setClips(prev => prev.filter(c => c.id !== id));
  };
  
  const deleteAllClips = async () => {
      // Async cleanup but immediate UI update
      Promise.all(clips.map(c => c.blobId ? DB.deleteFile(c.blobId) : Promise.resolve()))
        .catch(console.error);
      setClips(() => []);
  };

  const moveClip = (id: string, newX: number, newY: number) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, x: newX, y: newY } : c));
  };

  const moveClips = (updates: { id: string, x: number, y: number }[]) => {
      setClips(prev => prev.map(c => {
          const u = updates.find(update => update.id === c.id);
          return u ? { ...c, x: u.x, y: u.y } : c;
      }));
  };

  const resizeClip = (id: string, newCols: number, newRows: number) => {
     setClips(prev => prev.map(c => c.id === id ? { ...c, cols: newCols, rows: newRows } : c));
  };
  
  const importClips = (newClips: SoundClip[]) => {
      setClips(() => newClips);
  };

  return { 
      clips, 
      profiles,
      currentProfileId,
      isLoading, 
      saveClip, 
      deleteClip, 
      deleteAllClips,
      moveClip, 
      moveClips, 
      resizeClip, 
      importClips,
      createProfile,
      switchProfile,
      deleteProfile,
      renameProfile
  };
};