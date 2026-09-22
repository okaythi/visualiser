import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Verse, Word, FloorQuadrant } from '../types/visualiser';
import { FLOOR_QUADRANTS } from '../types/visualiser';

export interface WordState {
  word: string;
  quadrant: FloorQuadrant;
  opacity: number;
  scale: number;
  ghostQuadrants: Array<{ quadrant: FloorQuadrant; opacity: number }>;
}

const CENTER_QUADRANT: FloorQuadrant = FLOOR_QUADRANTS[0]!;

// Inter-verse timing constants
const LEAD_IN_SEC = 0.15;        // Smooth pre-entry fade before vocal starts
const FADE_OUT_GRACE_SEC = 0.35; // Natural vocal tail hold before clean fade out

/**
 * Floor lyrics engine with inter-verse dead-time mitigation.
 * - During singing: smooth word-by-word tracking with transient-reactive quadrant teleporting.
 * - At verse ends: snaps cleanly into graceful fade-out over FADE_OUT_GRACE_SEC.
 * - In inter-verse breaks (intro, guitar solos, bridge): text and ghosts are completely cleared,
 *   preventing lingering holds or rogue transient ghost stamps.
 */
export function useFloorLyrics(
  audioRef: React.RefObject<HTMLAudioElement>,
  verses: Verse[],
  transientRef: React.RefObject<number>,
  isRenderMode?: boolean,
  virtualTimeRef?: React.MutableRefObject<number>,
): WordState {
  const [wordState, setWordState] = useState<WordState>({
    word: '',
    quadrant: CENTER_QUADRANT,
    opacity: 0,
    scale: 1,
    ghostQuadrants: [],
  });

  const opacityRef       = useRef(0);
  const scaleRef         = useRef(1);
  const quadrantRef      = useRef<FloorQuadrant>(CENTER_QUADRANT);
  const currentWordRef   = useRef('');
  const lastWordKeyRef   = useRef('');
  const lastStampMs      = useRef(0);
  const ghostsRef        = useRef<Array<{ q: FloorQuadrant; o: number }>>([]);

  // Choreographed floor movement path across all 6 zones
  const QUADRANT_CHOREOGRAPHY = [3, 2, 4, 1, 5, 0];

  useFrame((_, delta) => {
    if (!isRenderMode && !audioRef.current) return;
    const d = isRenderMode ? 1 / 60 : delta;
    const now = isRenderMode && virtualTimeRef
      ? virtualTimeRef.current
      : (audioRef.current?.currentTime ?? 0);

    // ── 1. Find Current Active Word with Inter-Verse Mitigation ───────────
    let activeWord: Word | null = null;
    let activeVerseIdx = -1;
    let activeWordIdx = -1;
    let targetOpacity = 0.0;
    let isDuringSinging = false;

    for (let i = 0; i < verses.length; i++) {
      const verse = verses[i];
      if (!verse || !verse.words || verse.words.length === 0) continue;

      const firstWord = verse.words[0]!;
      const lastWord  = verse.words[verse.words.length - 1]!;

      // Check if current time is within verse envelope (lead-in -> grace window)
      if (now < firstWord.start - LEAD_IN_SEC || now > lastWord.end + FADE_OUT_GRACE_SEC) {
        continue;
      }

      // Pre-entry lead-in window
      if (now < firstWord.start) {
        activeWord = firstWord;
        activeVerseIdx = i;
        activeWordIdx = 0;
        const progress = Math.max(0, (now - (firstWord.start - LEAD_IN_SEC)) / LEAD_IN_SEC);
        targetOpacity = progress;
        isDuringSinging = false;
        break;
      }

      // Intra-verse word search
      for (let wIdx = 0; wIdx < verse.words.length; wIdx++) {
        const w = verse.words[wIdx]!;
        const isLast = (wIdx === verse.words.length - 1);

        if (!isLast) {
          if (now >= w.start && now < w.end) {
            activeWord = w;
            activeVerseIdx = i;
            activeWordIdx = wIdx;
            targetOpacity = 1.0;
            isDuringSinging = true;
            break;
          }
        } else {
          // Last word of verse: hold during word, then fade over grace window
          if (now >= w.start && now <= w.end) {
            activeWord = w;
            activeVerseIdx = i;
            activeWordIdx = wIdx;
            targetOpacity = 1.0;
            isDuringSinging = true;
            break;
          } else if (now > w.end && now <= w.end + FADE_OUT_GRACE_SEC) {
            activeWord = w;
            activeVerseIdx = i;
            activeWordIdx = wIdx;
            const graceFraction = (now - w.end) / FADE_OUT_GRACE_SEC;
            targetOpacity = Math.max(0.0, 1.0 - graceFraction);
            isDuringSinging = false;
            break;
          }
        }
      }

      if (activeWord) break;
    }

    // ── 2. Choreographed Word Movement Across Floor Quadrants ─────────────
    if (activeWord) {
      currentWordRef.current = activeWord.word;
      const wordKey = `${activeVerseIdx}-${activeWordIdx}`;

      if (wordKey !== lastWordKeyRef.current) {
        lastWordKeyRef.current = wordKey;

        // Leave a phosphor ghost trail at the previous position
        if (opacityRef.current > 0.25) {
          ghostsRef.current.push({ q: quadrantRef.current, o: 0.65 });
        }

        // Advance to next quadrant in the choreographed sequence
        const seqIndex = (activeWordIdx + activeVerseIdx * 2) % QUADRANT_CHOREOGRAPHY.length;
        const quadIndex = QUADRANT_CHOREOGRAPHY[seqIndex] ?? 0;
        quadrantRef.current = FLOOR_QUADRANTS[quadIndex] ?? CENTER_QUADRANT;

        // Punchy scale pop on new word
        scaleRef.current = 1.25;
      }
    } else {
      // In dead time between verses: fade out quickly and flush
      targetOpacity = 0.0;
      lastWordKeyRef.current = '';
      if (opacityRef.current < 0.03) {
        currentWordRef.current = '';
        ghostsRef.current = [];
        quadrantRef.current = CENTER_QUADRANT;
      }
    }

    // ── 3. Decay Ghosts ───────────────────────────────────────────────────
    if (ghostsRef.current.length > 0) {
      if (!activeWord) {
        ghostsRef.current = [];
      } else {
        ghostsRef.current = ghostsRef.current
          .map(g => ({ ...g, o: g.o - d * 3.8 }))
          .filter(g => g.o > 0.01);
      }
    }

    // ── 4. Transient Attack Bursts (Kick / Snare Pulse) ───────────────────
    const transient = transientRef.current ?? 0;
    const nowMs = isRenderMode ? now * 1000 : performance.now();
    const timeSince = nowMs - lastStampMs.current;

    if (isDuringSinging && activeWord && transient > 0.40 && timeSince > 140) {
      // Secondary phosphor pulse on heavy transients
      ghostsRef.current.push({ q: quadrantRef.current, o: 0.50 });
      scaleRef.current = 1.32;
      lastStampMs.current = nowMs;
    }

    // ── 5. Smooth Opacity & Scale Interpolation ───────────────────────────
    const opacitySpeed = activeWord ? 18 : 22;
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(d * opacitySpeed, 1);
    scaleRef.current   += (1.0 - scaleRef.current) * Math.min(d * 14, 1);

    // ── 6. Commit Snapshot to React State ─────────────────────────────────
    setWordState({
      word:           currentWordRef.current,
      quadrant:       quadrantRef.current,
      opacity:        opacityRef.current,
      scale:          scaleRef.current,
      ghostQuadrants: ghostsRef.current.map(g => ({ quadrant: g.q, opacity: g.o })),
    });
  });

  return wordState;
}
