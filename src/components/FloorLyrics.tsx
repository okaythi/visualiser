import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import type { WordState } from '../hooks/useFloorLyrics';

interface FloorLyricsProps {
  wordState: WordState;
}

/** Y height of text hovering just above the reflective floor */
const FLOOR_Y = 0.08;
/** Tilted back to lay in perspective like Star Wars crawl */
const TILT_X_DEG = -80;
const TILT_X_RAD = (TILT_X_DEG * Math.PI) / 180;

/** Crisp brand cyan for lyrics, matching Nixlabs design guidelines */
const PRIMARY_COLOR = '#38bdf8';
const GHOST_COLOR   = '#e040fb';

function WordMesh({
  text,
  x,
  z,
  opacity,
  scale,
  color,
}: {
  text: string;
  x: number;
  z: number;
  opacity: number;
  scale: number;
  color: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.scale.setScalar(scale);
  });

  if (opacity < 0.02 || !text) return null;

  return (
    <group ref={groupRef} position={[x, FLOOR_Y, z]} rotation={[TILT_X_RAD, 0, 0]}>
      <Text
        fontSize={0.42}
        letterSpacing={0.06}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/ubuntu-mono.ttf"
        fillOpacity={opacity}
        outlineWidth={0.015}
        outlineColor="#050508"
        outlineOpacity={opacity * 0.8}
      >
        {text}
      </Text>
    </group>
  );
}

export const FloorLyrics: React.FC<FloorLyricsProps> = ({ wordState }) => {
  const { word, quadrant, opacity, scale, ghostQuadrants } = wordState;

  if (!word || opacity < 0.02) return null;

  // Filter ghosts so they only show on other quadrants, never overlapping the active word
  const distinctGhosts = ghostQuadrants.filter(g => g.quadrant.id !== quadrant.id && g.opacity > 0.05);

  return (
    <group>
      {/* Phosphor ghost afterimages at previous positions */}
      {distinctGhosts.map((g, i) => (
        <WordMesh
          key={`ghost-${i}-${g.quadrant.id}`}
          text={word}
          x={g.quadrant.x}
          z={g.quadrant.z}
          opacity={g.opacity * 0.5}
          scale={1.0}
          color={GHOST_COLOR}
        />
      ))}

      {/* Primary single active word — crisp cyan */}
      <WordMesh
        text={word}
        x={quadrant.x}
        z={quadrant.z}
        opacity={opacity}
        scale={scale}
        color={PRIMARY_COLOR}
      />
    </group>
  );
};
