import { useRef, useState, useCallback, useEffect } from 'react';
import * as DB from '../services/db';
import { SoundClip } from '../types';

interface AudioInstance {
  sourceNode: MediaElementAudioSourceNode;
  gainNode: GainNode;
  element: HTMLAudioElement;
  clipId: string;
  baseVolume: number; // The clip's individual volume
  fadeInterval?: number;
}

export const useAudioPlayer = (globalVolume: number) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  
  const audioInstances = useRef<Map<string, AudioInstance>>(new Map());
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set());
  const [_, setTick] = useState(0); 

  // Initialize Web Audio API
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Create Master Gain (Global Volume)
        const masterGain = ctx.createGain();
        masterGain.gain.value = globalVolume;
        masterGainRef.current = masterGain;

        // Create Limiter (DynamicsCompressor)
        // Threshold: -2dB (prevents hard clipping at 0dB)
        // Ratio: 20 (High ratio makes it act like a limiter)
        // Attack: Fast (0.003s) to catch peaks
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -2; 
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        limiterRef.current = limiter;

        // Connect: MasterGain -> Limiter -> Destination
        masterGain.connect(limiter);
        limiter.connect(ctx.destination);
    }
    return () => {
        audioContextRef.current?.close();
    };
  }, []);

  // Update Global Volume via Master Gain
  useEffect(() => {
    if (masterGainRef.current) {
        // Smooth transition to prevent clicking
        masterGainRef.current.gain.setTargetAtTime(globalVolume, audioContextRef.current!.currentTime, 0.02);
    }
  }, [globalVolume]);

  const updatePlayingState = useCallback((id: string, isPlaying: boolean) => {
    setPlayingIds(prev => {
      const next = new Set(prev);
      if (isPlaying) next.add(id);
      else next.delete(id);
      return next;
    });
    setTick(t => t + 1);
  }, []);

  const fadeAudio = (
    instance: AudioInstance, 
    startVol: number, 
    endVol: number, 
    duration: number, 
    onComplete?: () => void
  ) => {
    if (instance.fadeInterval) clearInterval(instance.fadeInterval);
    
    const steps = 20;
    const intervalTime = 2000 / steps;
    const totalSteps = (duration / 1000) * steps;
    const volStep = (endVol - startVol) / totalSteps;
    
    let currentStep = 0;
    instance.gainNode.gain.value = startVol;

    instance.fadeInterval = window.setInterval(() => {
      currentStep++;
      const newVol = startVol + (volStep * currentStep);
      const checkEnd = (volStep > 0 && newVol >= endVol) || (volStep < 0 && newVol <= endVol);
      
      if (checkEnd) {
        instance.gainNode.gain.value = Math.max(0, Math.min(1, endVol));
        if (instance.fadeInterval) clearInterval(instance.fadeInterval);
        instance.fadeInterval = undefined;
        if (onComplete) onComplete();
      } else {
         instance.gainNode.gain.value = Math.max(0, Math.min(1, newVol));
      }
    }, intervalTime);
  };

  const stopSound = useCallback((id: string, fade: boolean = false, duration: number = 500) => {
    const instance = audioInstances.current.get(id);
    if (!instance) return;

    if (fade) {
      fadeAudio(instance, instance.gainNode.gain.value, 0, duration, () => {
        instance.element.pause();
        instance.element.currentTime = 0;
        // Disconnect nodes to free resources
        instance.sourceNode.disconnect();
        instance.gainNode.disconnect();
        
        audioInstances.current.delete(id);
        updatePlayingState(id, false);
      });
    } else {
      if (instance.fadeInterval) clearInterval(instance.fadeInterval);
      instance.element.pause();
      instance.element.currentTime = 0;
      instance.sourceNode.disconnect();
      instance.gainNode.disconnect();
      audioInstances.current.delete(id);
      updatePlayingState(id, false);
    }
  }, [updatePlayingState]);

  const playSound = useCallback(async (clip: SoundClip) => {
    if (!clip.blobId || !audioContextRef.current || !masterGainRef.current) return;

    // Ensure Context is running (Browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    // Toggle Logic
    if (audioInstances.current.has(clip.id)) {
      stopSound(clip.id, clip.fadeInOut);
      return;
    }

    try {
      const blob = await DB.getFile(clip.blobId);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.loop = clip.isLooping;

      // Web Audio Graph: Source -> ClipGain -> MasterGain(Global) -> Limiter -> Destination
      const source = audioContextRef.current.createMediaElementSource(audio);
      const clipGain = audioContextRef.current.createGain();
      
      source.connect(clipGain);
      clipGain.connect(masterGainRef.current);

      const targetVol = clip.volume; 
      const useFade = clip.fadeInOut ?? true;

      // Initial Volume
      clipGain.gain.value = useFade ? 0 : targetVol;
      
      const instance: AudioInstance = { 
          element: audio, 
          clipId: clip.id, 
          baseVolume: clip.volume,
          sourceNode: source,
          gainNode: clipGain
      };
      
      audioInstances.current.set(clip.id, instance);
      updatePlayingState(clip.id, true);

      await audio.play();

      if (useFade) {
        fadeAudio(instance, 0, targetVol, 300); 
      }

      audio.onended = () => {
        if (instance.fadeInterval) clearInterval(instance.fadeInterval);
        updatePlayingState(clip.id, false);
        
        // Cleanup Graph
        source.disconnect();
        clipGain.disconnect();
        audioInstances.current.delete(clip.id);
        URL.revokeObjectURL(url);
      };

    } catch (e) {
      console.error("Playback failed", e);
      updatePlayingState(clip.id, false);
    }
  }, [stopSound, updatePlayingState]);

  const stopAll = useCallback(() => {
    // Collect IDs first to avoid map modification issues during iteration
    const idsToStop = Array.from(audioInstances.current.keys());
    idsToStop.forEach((id) => {
      // Use 1 second fade for "Stop All"
      stopSound(id, true, 2000); 
    });
  }, [stopSound]);

  // Adjust volume for a specific running instance (Mixer functionality)
  const setInstanceVolume = useCallback((id: string, vol: number) => {
      const instance = audioInstances.current.get(id);
      if (instance) {
          instance.baseVolume = vol;
          // Apply immediately to the GainNode
          instance.gainNode.gain.setValueAtTime(vol, audioContextRef.current!.currentTime);
          // Force update so UI sliders react
          setTick(t => t + 1);
      }
  }, []);

  return { playingIds, playSound, stopAll, audioInstances: audioInstances.current, setInstanceVolume };
};
