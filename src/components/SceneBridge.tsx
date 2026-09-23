import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TelemetryManifest, Verse, StemFrame, SpatialZones } from '../types/visualiser';
import { NeonStage } from './NeonStage';
import { FloorLyrics } from './FloorLyrics';
import { useFloorLyrics } from '../hooks/useFloorLyrics';

interface SceneBridgeProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  manifest: TelemetryManifest | null;
  verses: Verse[];
  isRenderMode?: boolean;
  virtualTimeRef?: React.MutableRefObject<number>;
}

const EMPTY_FRAME: StemFrame = { rms: 0, transient: 0, pan: 0, width: 0, brightness: 0 };
const LOOK_TARGET = new THREE.Vector3(0.8045, 1.85, -5.7402);

const EMPTY_ZONES: SpatialZones = {
  z1Portal:    { rms: 0, transient: 0 },
  z2LeftFar:   { rms: 0, transient: 0 },
  z3RightFar:  { rms: 0, transient: 0 },
  z4LeftNear:  { rms: 0, transient: 0 },
  z5RightNear: { rms: 0, transient: 0 },
  z6Floor:     { rms: 0, transient: 0 },
  z7SkyVault:  { rms: 0, transient: 0 },
};

/**
 * CameraDirector with physical acoustic recoil:
 * - Damped elastic spring impulse on kick/sub-bass impacts
 * - Locked to the approved vantage point [0.40, 1.95, 6.20]
 */
function CameraDirector({
  kickTransientRef,
  bassRmsRef,
  isRenderMode,
  virtualTimeRef,
}: {
  kickTransientRef: React.RefObject<number>;
  bassRmsRef: React.RefObject<number>;
  isRenderMode?: boolean;
  virtualTimeRef?: React.MutableRefObject<number>;
}) {
  const { camera } = useThree();
  const recoilRef = useRef(0);

  useFrame((state, delta) => {
    const d = isRenderMode ? 1 / 60 : delta;
    const kickTransient = kickTransientRef.current ?? 0;
    const bassRms = bassRmsRef.current ?? 0;
    const elapsedTime = isRenderMode && virtualTimeRef ? virtualTimeRef.current : state.clock.getElapsedTime();

    // Physical elastic impulse on kick impact (smoothly cushioned)
    if (kickTransient > 0.40) {
      recoilRef.current += kickTransient * 0.015;
    }
    // Damped spring recoil return
    recoilRef.current += (0 - recoilRef.current) * Math.min(d * 8, 1);

    // Subtle bass physical tremor
    const bassTremor = bassRms * 0.004 * Math.sin(elapsedTime * 16);

    camera.position.set(0.40, 1.95 + bassTremor - recoilRef.current * 0.10, 6.20 + recoilRef.current * 0.25);
    camera.lookAt(LOOK_TARGET);
  });

  return null;
}

export const SceneBridge: React.FC<SceneBridgeProps> = ({
  audioRef,
  manifest,
  verses,
  isRenderMode,
  virtualTimeRef,
}) => {
  const zonesRef = useRef<SpatialZones>({ ...EMPTY_ZONES });
  const kickTransientRef = useRef<number>(0);
  const bassRmsRef = useRef<number>(0);

  useFrame(() => {
    if (!manifest) return;
    if (!isRenderMode && !audioRef.current) return;

    const t = isRenderMode && virtualTimeRef
      ? virtualTimeRef.current
      : (audioRef.current?.currentTime ?? 0);

    const read = (name: string): StemFrame => {
      const frames = manifest.stems[name];
      if (!frames || frames.length === 0) return EMPTY_FRAME;
      const idx = Math.min(Math.floor(t * manifest.fps), frames.length - 1);
      return frames[idx] ?? EMPTY_FRAME;
    };

    // ── Zone 1: Center Portal (Lead Vocals + Kick singularity) ─────────────
    const ldv   = read('lead_vocal');
    const ldv2  = read('LDV STEM');
    const kick  = read('kick');
    const kick2 = read('KICK STEM');
    const z1Rms = Math.max(ldv.rms, ldv2.rms) * 0.70 + Math.max(kick.rms, kick2.rms) * 0.30;
    const z1Trans = Math.max(kick.transient, kick2.transient, ldv.transient);

    // ── Zone 2: Left Far Monoliths (GTR1, SYN1, SYN3, BGV1) ────────────────
    const gtr1 = read('GTR1 STEM');
    const syn1 = read('SYN1 STEM');
    const syn3 = read('SYN3 STEM');
    const bgv1 = read('BGV1 STEM');
    const z2Rms = Math.max(gtr1.rms, syn1.rms, syn3.rms) * 1.35 + bgv1.rms * 0.9 + z1Rms * 0.05;
    const z2Trans = Math.max(gtr1.transient, syn1.transient, bgv1.transient);

    // ── Zone 3: Right Far Monoliths (GTR2, SYN2, SYN4, BGV2, LEAD SYNTH) ───
    const gtr2  = read('GTR2 STEM');
    const syn2  = read('SYN2 STEM');
    const syn4  = read('SYN4 STEM');
    const bgv2  = read('BGV2 STEM');
    const ldsyn = read('lead_synth');
    const z3Rms = Math.max(syn2.rms, bgv2.rms, syn4.rms, ldsyn.rms) * 1.35 + gtr2.rms * 0.9 + z1Rms * 0.05;
    const z3Trans = Math.max(syn2.transient, bgv2.transient, gtr2.transient, ldsyn.transient);

    // ── Zone 4: Left Near Pillars (CLAPS, FILLS, BGV3, SNARE, FX) ──────────
    const claps = read('CLAPS STEM');
    const fills = read('FILLS STEM');
    const bgv3  = read('BGV3 STEM');
    const fx    = read('FX STEM');
    const snare = read('snare');
    const z4Rms = (claps.rms + fills.rms + bgv3.rms + fx.rms + snare.rms * 0.8) / 2.6;
    const z4Trans = Math.max(claps.transient, fills.transient, snare.transient);

    // ── Zone 5: Right Near Pillars (HATS, VOCODER, VOX FX, GTR3) ───────────
    const hats  = read('hats');
    const vocod = read('VOCODER STEM');
    const voxfx = read('VOX FX STEM');
    const gtr3  = read('GTR3 STEM');
    const z5Rms = (hats.rms + vocod.rms + voxfx.rms + gtr3.rms) / 2.6;
    const z5Trans = Math.max(hats.transient, vocod.transient);

    // ── Zone 6: Floor Walkway (BASS 1-6, bass, LOOPS) ─────────────────────
    const b1 = read('BASS1 STEM');
    const b2 = read('BASS2 STEM');
    const b3 = read('BASS3 STEM');
    const b4 = read('BASS4 STEM');
    const b5 = read('BASS5 STEM');
    const b6 = read('BASS6 STEM');
    const b0 = read('bass');
    const loops = read('LOOPS STEM');
    const z6Rms = Math.max(b0.rms, b1.rms, b2.rms, b3.rms, b4.rms, b5.rms, b6.rms) * 0.85 + loops.rms * 0.15;
    const z6Trans = Math.max(b1.transient, b2.transient, b6.transient);

    // ── Zone 7: Cavern Vault / Sky (STRINGS, SYN CHOIR, ADLIBS) ───────────
    const strings = read('STRINGS STEM');
    const choir   = read('SYN CHOIR STEM');
    const adlibs  = read('ADLIBS STEM');
    const z7Rms = (strings.rms * 1.2 + choir.rms * 1.3 + adlibs.rms) / 2.8;
    const z7Trans = Math.max(strings.transient, choir.transient, adlibs.transient);

    zonesRef.current = {
      z1Portal:    { rms: z1Rms, transient: z1Trans },
      z2LeftFar:   { rms: z2Rms, transient: z2Trans },
      z3RightFar:  { rms: z3Rms, transient: z3Trans },
      z4LeftNear:  { rms: z4Rms, transient: z4Trans },
      z5RightNear: { rms: z5Rms, transient: z5Trans },
      z6Floor:     { rms: z6Rms, transient: z6Trans },
      z7SkyVault:  { rms: z7Rms, transient: z7Trans },
    };

    kickTransientRef.current = z1Trans;
    bassRmsRef.current = z6Rms;
  });

  const wordState = useFloorLyrics(audioRef, verses, kickTransientRef, isRenderMode, virtualTimeRef);

  return (
    <>
      <CameraDirector
        kickTransientRef={kickTransientRef}
        bassRmsRef={bassRmsRef}
        isRenderMode={isRenderMode}
        virtualTimeRef={virtualTimeRef}
      />

      <NeonStage zonesRef={zonesRef} />

      <FloorLyrics wordState={wordState} />
    </>
  );
};
