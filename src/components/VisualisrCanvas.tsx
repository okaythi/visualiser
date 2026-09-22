import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { TelemetryManifest, Verse } from '../types/visualiser';
import { Environment } from '@react-three/drei';
import { SceneBridge } from './SceneBridge';
import { BloomLayer } from './BloomLayer';

interface VisualisrSceneProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  manifest: TelemetryManifest | null;
  verses: Verse[];
  isRenderMode?: boolean;
}

function DeterministicBridge({
  isRenderMode,
  virtualTimeRef,
}: {
  isRenderMode: boolean;
  virtualTimeRef: React.MutableRefObject<number>;
}) {
  const { advance } = useThree();

  useEffect(() => {
    if (!isRenderMode) return;

    (window as any).__SEEK_FRAME__ = async (frameIndex: number) => {
      const t = frameIndex / 60.0;
      virtualTimeRef.current = t;
      advance(t);
    };

    (window as any).__IS_READY_FOR_CAPTURE__ = () => {
      return Boolean(
        (window as any).__APP_READY__ &&
        (window as any).__IS_STAGE_LOADED__
      );
    };

    return () => {
      delete (window as any).__SEEK_FRAME__;
      delete (window as any).__IS_READY_FOR_CAPTURE__;
    };
  }, [isRenderMode, advance, virtualTimeRef]);

  return null;
}

export const VisualisrCanvas: React.FC<VisualisrSceneProps> = (props) => {
  const isRenderMode =
    props.isRenderMode ??
    (typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).get('render') === '1' ||
        Boolean((window as any).__DETERMINISTIC_MODE__)));

  const virtualTimeRef = useRef(0);

  return (
    <Canvas
      shadows="soft"
      frameloop={isRenderMode ? 'never' : 'always'}
      gl={{
        antialias: true,
        toneMapping: THREE.AgXToneMapping,
        toneMappingExposure: 1.2,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
      style={{ position: 'fixed', inset: 0, background: '#000000' }}
    >
      <fogExp2 attach="fog" args={['#05040a', 0.032]} />
      <Environment files="/textures/night.hdr" environmentIntensity={0.65} />
      <SceneBridge
        {...props}
        isRenderMode={isRenderMode}
        virtualTimeRef={virtualTimeRef}
      />
      <BloomLayer />
      <DeterministicBridge
        isRenderMode={isRenderMode}
        virtualTimeRef={virtualTimeRef}
      />
    </Canvas>
  );
};

