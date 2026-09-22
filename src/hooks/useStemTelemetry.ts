import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { TelemetryManifest, StemFrame } from '../types/visualiser';

const EMPTY_FRAME: StemFrame = {
  rms: 0, transient: 0, pan: 0, width: 0, brightness: 0,
};

/**
 * Returns a ref that is updated every frame with the current StemFrame
 * for the given stem, synced to the audio element's currentTime.
 *
 * Must be called inside a component that is a descendant of <Canvas>.
 */
export function useStemTelemetry(
  audioRef: React.RefObject<HTMLAudioElement>,
  manifest: TelemetryManifest | null,
  stemName: string,
): React.RefObject<StemFrame> {
  const frameRef = useRef<StemFrame>({ ...EMPTY_FRAME });

  useFrame(() => {
    if (!manifest || !audioRef.current) return;
    const frames = manifest.stems[stemName];
    if (!frames || frames.length === 0) return;

    const t = audioRef.current.currentTime;
    const idx = Math.min(
      Math.floor(t * manifest.fps),
      frames.length - 1,
    );
    frameRef.current = frames[idx] ?? EMPTY_FRAME;
  });

  return frameRef;
}

/** Smooth exponential lerp: call every frame */
export function elerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha;
}
