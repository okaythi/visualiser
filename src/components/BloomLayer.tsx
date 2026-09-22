import React from 'react';
import { Effects } from '@react-three/drei';
import { UnrealBloomPass } from 'three-stdlib';
import { extend } from '@react-three/fiber';

// Register UnrealBloomPass as a JSX element for drei's <Effects>
extend({ UnrealBloomPass });

// TypeScript: tell JSX about the new element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      unrealBloomPass: {
        args?: [width?: number, height?: number, strength?: number, radius?: number, threshold?: number];
        strength?: number;
        radius?: number;
        threshold?: number;
      };
    }
  }
}

/**
 * Bloom post-processing using drei's <Effects> + UnrealBloomPass.
 * Compatible with @react-three/fiber v8. No @react-three/postprocessing needed.
 */
export const BloomLayer: React.FC = () => (
  <Effects disableGamma>
    <unrealBloomPass
      args={[undefined, undefined, 0.85, 0.8, 0.65]}
      strength={0.85}
      radius={0.8}
      threshold={0.65}
    />
  </Effects>
);
