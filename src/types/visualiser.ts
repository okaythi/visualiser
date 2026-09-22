/**
 * Core types for the Abracadabra visualiser.
 */

/** One word entry from the karaoke lyric engine */
export interface Word {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

/** A verse grouping from the karaoke engine */
export interface Verse {
  verseStart: number;
  verseEnd: number;
  words: Word[];
}

/** One frame of per-stem audio telemetry at 60 FPS */
export interface StemFrame {
  rms: number;        // 0.0 → 1.0  overall energy
  transient: number;  // 0.0 → 1.0  onset attack / punch
  pan: number;        // -1.0 → +1.0 stereo pan position
  width: number;      // 0.0 → 1.0  stereo width
  brightness: number; // 0.0 → 1.0  spectral centroid
}

/** Full telemetry manifest loaded from /telemetry.json */
export interface TelemetryManifest {
  fps: number;
  stems: Record<string, StemFrame[]>;
}

/**
 * The 6 floor quadrant positions for Star-Wars-style word teleportation.
 * Coordinates are in 3D world space (x, z) on the floor plane; y = 0.
 * They form a perspective grid from camera (near) to ring (far).
 */
export interface FloorQuadrant {
  id: number;
  x: number;  // lateral offset (negative = left, positive = right)
  z: number;  // depth (negative = far/toward ring, positive = near/toward camera)
}

export const FLOOR_QUADRANTS: FloorQuadrant[] = [
  { id: 0, x: 0.80, z: -2.0 },  // Deep Center (near ring)
  { id: 1, x: 0.15, z: -0.6 },  // Left Mid
  { id: 2, x: 1.35, z: -0.6 },  // Right Mid
  { id: 3, x: 0.25, z:  1.0 },  // Left Fore
  { id: 4, x: 1.25, z:  1.0 },  // Right Fore
  { id: 5, x: 0.75, z:  2.2 },  // Fore Center (near camera)
];

/** 7 physical spatial audio-visual zones across the 3D cavern stage */
export interface SpatialZones {
  z1Portal:    { rms: number; transient: number }; // Center Portal (Lead Vocal + Kick)
  z2LeftFar:   { rms: number; transient: number }; // Left Deep Monoliths (GTR1, SYN1, SYN3, BGV1)
  z3RightFar:  { rms: number; transient: number }; // Right Deep Monoliths (GTR2, SYN2, SYN4, BGV2)
  z4LeftNear:  { rms: number; transient: number }; // Left Fore Pillars (CLAPS, FILLS, BGV3, FX)
  z5RightNear: { rms: number; transient: number }; // Right Fore Pillars (HATS, VOCODER, VOX FX)
  z6Floor:     { rms: number; transient: number }; // Floor Walkway (BASS 1-6, bass, LOOPS)
  z7SkyVault:  { rms: number; transient: number }; // Cavern Sky Dome / Vault (STRINGS, SYN CHOIR, ADLIBS)
}
