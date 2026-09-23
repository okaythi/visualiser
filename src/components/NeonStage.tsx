import React, { useRef, Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFBX, useTexture, MeshReflectorMaterial } from '@react-three/drei';
import type { SpatialZones } from '../types/visualiser';

export interface NeonStageProps {
  zonesRef: React.RefObject<SpatialZones>;
}

const EMPTY_ZONES: SpatialZones = {
  z1Portal:    { rms: 0, transient: 0 },
  z2LeftFar:   { rms: 0, transient: 0 },
  z3RightFar:  { rms: 0, transient: 0 },
  z4LeftNear:  { rms: 0, transient: 0 },
  z5RightNear: { rms: 0, transient: 0 },
  z6Floor:     { rms: 0, transient: 0 },
  z7SkyVault:  { rms: 0, transient: 0 },
};

// Module-level static constants to prevent Drei MeshReflectorMaterial useMemo FBO recreation leak
const REFLECTOR_BLUR: [number, number] = [120, 40];
const REFLECTOR_NORMAL_SCALE = new THREE.Vector2(0.35, 0.35);

export interface StageUniforms {
  uTime:     { value: number };
  uZ1Rms:    { value: number };
  uZ1Trans:  { value: number };
  uZ2Rms:    { value: number };
  uZ2Trans:  { value: number };
  uZ3Rms:    { value: number };
  uZ3Trans:  { value: number };
  uZ4Rms:    { value: number };
  uZ4Trans:  { value: number };
  uZ5Rms:    { value: number };
  uZ5Trans:  { value: number };
  uZ6Rms:    { value: number };
  uZ6Trans:  { value: number };
  uZ7Rms:    { value: number };
  uZ7Trans:  { value: number };
}

/**
 * 7-Zone Native Spatial Audio-Visual Animator:
 * - Damped elastic spring recoil on kick / vocal transients
 * - Strictly physical stem-driven fluid harmonics (no arbitrary timers)
 * - 7 physical zone point lights dynamically tuned to spatial stem energy
 */
function StageAnimator({
  ringRef,
  reflectorRef,
  z1LightRef,
  z2LightRef,
  z3LightRef,
  z4LightRef,
  z5LightRef,
  z6LightRef,
  z7LightRef,
  uniformsRef,
  zonesRef,
}: {
  ringRef: React.RefObject<THREE.Mesh | null>;
  reflectorRef: React.RefObject<any>;
  z1LightRef: React.RefObject<THREE.PointLight | null>;
  z2LightRef: React.RefObject<THREE.PointLight | null>;
  z3LightRef: React.RefObject<THREE.PointLight | null>;
  z4LightRef: React.RefObject<THREE.PointLight | null>;
  z5LightRef: React.RefObject<THREE.PointLight | null>;
  z6LightRef: React.RefObject<THREE.PointLight | null>;
  z7LightRef: React.RefObject<THREE.PointLight | null>;
  uniformsRef: React.MutableRefObject<StageUniforms>;
  zonesRef: React.RefObject<SpatialZones>;
}) {
  const baseScaleRef = useRef<THREE.Vector3 | null>(null);
  const springVelocityRef = useRef<number>(0);
  const springOffsetRef = useRef<number>(0);

  useFrame((state, delta) => {
    const zones = zonesRef.current ?? EMPTY_ZONES;
    const z1 = zones.z1Portal;
    const z2 = zones.z2LeftFar;
    const z3 = zones.z3RightFar;
    const z4 = zones.z4LeftNear;
    const z5 = zones.z5RightNear;
    const z6 = zones.z6Floor;
    const z7 = zones.z7SkyVault;

    // Cache Torus base scale
    if (ringRef.current && !baseScaleRef.current) {
      baseScaleRef.current = ringRef.current.scale.clone();
    }

    // ── 1. Update 7-Zone Shader Uniforms ──────────────────────────────────
    const u = uniformsRef.current;
    u.uTime.value    = state.clock.getElapsedTime();
    u.uZ1Rms.value   = THREE.MathUtils.lerp(u.uZ1Rms.value, z1.rms, Math.min(delta * 14, 1));
    u.uZ1Trans.value = THREE.MathUtils.lerp(u.uZ1Trans.value, z1.transient, Math.min(delta * 18, 1));
    u.uZ2Rms.value   = THREE.MathUtils.lerp(u.uZ2Rms.value, z2.rms, Math.min(delta * 12, 1));
    u.uZ2Trans.value = THREE.MathUtils.lerp(u.uZ2Trans.value, z2.transient, Math.min(delta * 16, 1));
    u.uZ3Rms.value   = THREE.MathUtils.lerp(u.uZ3Rms.value, z3.rms, Math.min(delta * 12, 1));
    u.uZ3Trans.value = THREE.MathUtils.lerp(u.uZ3Trans.value, z3.transient, Math.min(delta * 16, 1));
    u.uZ4Rms.value   = THREE.MathUtils.lerp(u.uZ4Rms.value, z4.rms, Math.min(delta * 14, 1));
    u.uZ4Trans.value = THREE.MathUtils.lerp(u.uZ4Trans.value, z4.transient, Math.min(delta * 18, 1));
    u.uZ5Rms.value   = THREE.MathUtils.lerp(u.uZ5Rms.value, z5.rms, Math.min(delta * 14, 1));
    u.uZ5Trans.value = THREE.MathUtils.lerp(u.uZ5Trans.value, z5.transient, Math.min(delta * 18, 1));
    u.uZ6Rms.value   = THREE.MathUtils.lerp(u.uZ6Rms.value, z6.rms, Math.min(delta * 12, 1));
    u.uZ6Trans.value = THREE.MathUtils.lerp(u.uZ6Trans.value, z6.transient, Math.min(delta * 16, 1));
    u.uZ7Rms.value   = THREE.MathUtils.lerp(u.uZ7Rms.value, z7.rms, Math.min(delta * 10, 1));
    u.uZ7Trans.value = THREE.MathUtils.lerp(u.uZ7Trans.value, z7.transient, Math.min(delta * 14, 1));

    // Dynamic acoustic normal distortion on floor reflections (808s and kicks)
    if (reflectorRef.current) {
      reflectorRef.current.distortion = 0.25 + z6.rms * 0.45;
    }

    // ── 2. Damped Spring Recoil on Portal Ring (Kick / Singularity) ────────
    if (z1.transient > 0.3) {
      springVelocityRef.current += z1.transient * 0.75;
    }
    const kStiffness = 45.0;
    const cDamping   = 7.0;
    const springAccel = -kStiffness * springOffsetRef.current - cDamping * springVelocityRef.current;
    springVelocityRef.current += springAccel * delta;
    springOffsetRef.current += springVelocityRef.current * delta;

    if (ringRef.current && baseScaleRef.current) {
      const scaleFactor = 1.0 + springOffsetRef.current * 0.12 + z1.rms * 0.05 + z6.rms * 0.03;
      ringRef.current.scale.set(
        baseScaleRef.current.x * scaleFactor,
        baseScaleRef.current.y * scaleFactor,
        baseScaleRef.current.z * scaleFactor
      );
    }

    // ── 3. 7 Native Physical 3D Lights Dynamic Intensity ──────────────────
    if (z1LightRef.current) {
      const t = 4.5 + z1.rms * 5.5 + z1.transient * 4.5;
      z1LightRef.current.intensity = THREE.MathUtils.lerp(z1LightRef.current.intensity, t, Math.min(delta * 12, 1));
    }
    if (z2LightRef.current) {
      const t = 2.4 + z2.rms * 6.5 + z2.transient * 3.5;
      z2LightRef.current.intensity = THREE.MathUtils.lerp(z2LightRef.current.intensity, t, Math.min(delta * 14, 1));
    }
    if (z3LightRef.current) {
      const t = 2.4 + z3.rms * 6.5 + z3.transient * 3.5;
      z3LightRef.current.intensity = THREE.MathUtils.lerp(z3LightRef.current.intensity, t, Math.min(delta * 14, 1));
    }
    if (z4LightRef.current) {
      const t = 1.4 + z4.rms * 4.0 + z4.transient * 3.5;
      z4LightRef.current.intensity = THREE.MathUtils.lerp(z4LightRef.current.intensity, t, Math.min(delta * 14, 1));
    }
    if (z5LightRef.current) {
      const t = 1.4 + z5.rms * 4.0 + z5.transient * 3.5;
      z5LightRef.current.intensity = THREE.MathUtils.lerp(z5LightRef.current.intensity, t, Math.min(delta * 14, 1));
    }
    if (z6LightRef.current) {
      const t = 2.4 + z6.rms * 5.0 + z6.transient * 2.5;
      z6LightRef.current.intensity = THREE.MathUtils.lerp(z6LightRef.current.intensity, t, Math.min(delta * 10, 1));
    }
    if (z7LightRef.current) {
      const t = 1.2 + z7.rms * 3.5 + z7.transient * 2.0;
      z7LightRef.current.intensity = THREE.MathUtils.lerp(z7LightRef.current.intensity, t, Math.min(delta * 8, 1));
    }
  });

  return null;
}

const StageModel = React.memo(function StageModel(props: NeonStageProps) {
  const fbx = useFBX('/models/neon-stage/neon-stage.fbx');
  const ringRef      = useRef<THREE.Mesh | null>(null);
  const reflectorRef = useRef<any>(null);

  const z1LightRef = useRef<THREE.PointLight | null>(null);
  const z2LightRef = useRef<THREE.PointLight | null>(null);
  const z3LightRef = useRef<THREE.PointLight | null>(null);
  const z4LightRef = useRef<THREE.PointLight | null>(null);
  const z5LightRef = useRef<THREE.PointLight | null>(null);
  const z6LightRef = useRef<THREE.PointLight | null>(null);
  const z7LightRef = useRef<THREE.PointLight | null>(null);

  const uniformsRef = useRef<StageUniforms>({
    uTime:     { value: 0 },
    uZ1Rms:    { value: 0 },
    uZ1Trans:  { value: 0 },
    uZ2Rms:    { value: 0 },
    uZ2Trans:  { value: 0 },
    uZ3Rms:    { value: 0 },
    uZ3Trans:  { value: 0 },
    uZ4Rms:    { value: 0 },
    uZ4Trans:  { value: 0 },
    uZ5Rms:    { value: 0 },
    uZ5Trans:  { value: 0 },
    uZ6Rms:    { value: 0 },
    uZ6Trans:  { value: 0 },
    uZ7Rms:    { value: 0 },
    uZ7Trans:  { value: 0 },
  });

  const [floorColor, floorNormal, floorRough, circleTex, bgTex] = useTexture([
    '/models/neon-stage/textures/FloorColor.png',
    '/models/neon-stage/textures/FloorNormal2.png',
    '/models/neon-stage/textures/FloorRougness.png',
    '/models/neon-stage/textures/Circle.png',
    '/models/neon-stage/textures/BackGround.png',
  ]) as THREE.Texture[];

  if (floorColor) floorColor.colorSpace = THREE.SRGBColorSpace;
  if (circleTex) circleTex.colorSpace  = THREE.SRGBColorSpace;
  if (bgTex) bgTex.colorSpace      = THREE.SRGBColorSpace;

  useEffect(() => {
    fbx.traverse((obj) => {
      // Clean out internal FBX raw lights to maintain physical lighting control
      if (obj instanceof THREE.PointLight) {
        obj.visible = false;
        obj.intensity = 0;
        return;
      }

      if (!(obj instanceof THREE.Mesh)) return;

      switch (obj.name) {
        case 'Plane': {
          // Hide FBX static plane; replaced by high-precision MeshReflectorMaterial
          obj.visible = false;
          break;
        }

        case 'Torus': {
          // Molten Liquid Plasma Portal Ring
          const ringMat = new THREE.MeshStandardMaterial({
            map: circleTex,
            emissiveMap: circleTex,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 2.2,
            roughness: 0.08,
            metalness: 0.2,
            toneMapped: false,
            side: THREE.DoubleSide,
          });

          // Inject strictly physical fluid harmonics driven by vocal & stem energies
          ringMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime    = uniformsRef.current.uTime;
            shader.uniforms.uZ1Rms   = uniformsRef.current.uZ1Rms;
            shader.uniforms.uZ1Trans = uniformsRef.current.uZ1Trans;
            shader.uniforms.uZ2Rms   = uniformsRef.current.uZ2Rms;
            shader.uniforms.uZ3Rms   = uniformsRef.current.uZ3Rms;
            shader.uniforms.uZ6Rms   = uniformsRef.current.uZ6Rms;

            shader.vertexShader = `
              uniform float uTime;
              uniform float uZ1Rms;
              uniform float uZ1Trans;
              uniform float uZ2Rms;
              uniform float uZ3Rms;
              uniform float uZ6Rms;
              varying float vAngle;
              varying float vDisplacement;
              ${shader.vertexShader}
            `;

            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              vAngle = atan(position.y, position.x);
              // Radial displacement in 2D XY plane to handle 0.02 tube thickness
              vec2 radial = length(position.xy) > 0.001 ? normalize(position.xy) : vec2(0.0, 1.0);

              // Spatial hemisphere weights
              float leftWeight   = clamp(-cos(vAngle), 0.0, 1.0);
              float rightWeight  = clamp(cos(vAngle), 0.0, 1.0);
              float bottomWeight = clamp(-sin(vAngle), 0.0, 1.0);

              // 1. Stereo spatial fluid slosh: Left pushes left hemisphere, Right pushes right hemisphere
              float stereoSlosh = (uZ2Rms * leftWeight + uZ3Rms * rightWeight) * 0.32;

              // 2. Harmonic fluid waves proportional to stem energies:
              // Sub-bass creates viscous deep ripples (mode 3)
              float waveBass = sin(vAngle * 3.0 - uTime * 3.2) * (uZ6Rms * 0.32 + bottomWeight * uZ6Rms * 0.18);

              // Lead vocal creates rapid surface rippling (modes 7 and 11)
              float waveVocal = sin(vAngle * 7.0 + uTime * 5.0) * (uZ1Rms * 0.26)
                              + cos(vAngle * 11.0 - uTime * 7.0) * (uZ1Rms * 0.14);

              // Kick transient creates sharp radial expansion
              float pulseKick = uZ1Trans * 0.32;

              float totalRadial = stereoSlosh + waveBass + waveVocal + pulseKick;
              vDisplacement = totalRadial;

              // Radially displace the ring in the XY plane
              transformed.xy += radial * totalRadial;

              // Organic out-of-plane liquid wobble in Z
              transformed.z += sin(vAngle * 4.0 + uTime * 2.8) * (uZ6Rms * 0.10 + uZ1Rms * 0.08);
              `
            );

            shader.fragmentShader = `
              uniform float uTime;
              uniform float uZ1Rms;
              uniform float uZ1Trans;
              uniform float uZ2Rms;
              uniform float uZ3Rms;
              varying float vAngle;
              varying float vDisplacement;
              ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              // Wave crest intensity
              float waveCrest = clamp(vDisplacement * 2.8, 0.0, 2.0);

              // Traveling liquid fluid caustics
              float causticPhase = uTime * 4.2;
              float caustic1 = pow(sin(vAngle * 6.0 - causticPhase) * 0.5 + 0.5, 4.0);
              float caustic2 = pow(cos(vAngle * 8.0 + causticPhase * 1.3) * 0.5 + 0.5, 4.0);
              float liquidCaustic = (caustic1 + caustic2) * (uZ1Rms * 1.2 + (uZ2Rms + uZ3Rms) * 0.6);

              // Spatial color gradient: Crimson/magenta on left to electric cyan/blue on right
              float lrMix = cos(vAngle) * 0.5 + 0.5; // 0 on left, 1 on right
              vec3 cMagenta = vec3(0.95, 0.12, 0.65);
              vec3 cCyan    = vec3(0.00, 0.85, 1.00);
              vec3 cWhite   = vec3(1.00, 0.99, 1.00); // incandescent white-hot liquid core

              vec3 baseColor = mix(cMagenta, cCyan, lrMix);
              vec3 fluidColor = mix(baseColor, cWhite, clamp(waveCrest * 0.65 + uZ1Trans * 0.75, 0.0, 1.0));

              // Emissive radiance: strictly proportional to audio
              float ringGlow = 3.6 + uZ1Rms * 3.5 + uZ1Trans * 4.0 + waveCrest * 1.8 + liquidCaustic * 1.0;
              totalEmissiveRadiance = fluidColor * ringGlow;
              `
            );
          };

          obj.material = ringMat;
          obj.castShadow = false;
          obj.renderOrder = 10;
          ringRef.current = obj;
          break;
        }

        case 'Cylinder067':
        case 'Cylinder.067': {
          // Volcanic Obsidian Glass with physical stem-coupled emissive facet lighting
          const monolithMat = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0x06040a),
            roughness: 0.22,
            metalness: 0.10,
            clearcoat: 0.25,
            clearcoatRoughness: 0.15,
            reflectivity: 0.35,
            envMapIntensity: 0.55,
          });

          // Inject 7-zone spatial audio energy directly into the obsidian surface
          monolithMat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime    = uniformsRef.current.uTime;
            shader.uniforms.uZ1Rms   = uniformsRef.current.uZ1Rms;
            shader.uniforms.uZ2Rms   = uniformsRef.current.uZ2Rms;
            shader.uniforms.uZ2Trans = uniformsRef.current.uZ2Trans;
            shader.uniforms.uZ3Rms   = uniformsRef.current.uZ3Rms;
            shader.uniforms.uZ3Trans = uniformsRef.current.uZ3Trans;
            shader.uniforms.uZ4Rms   = uniformsRef.current.uZ4Rms;
            shader.uniforms.uZ4Trans = uniformsRef.current.uZ4Trans;
            shader.uniforms.uZ5Rms   = uniformsRef.current.uZ5Rms;
            shader.uniforms.uZ5Trans = uniformsRef.current.uZ5Trans;
            shader.uniforms.uZ7Rms   = uniformsRef.current.uZ7Rms;

            shader.vertexShader = `
              varying vec3 vMonolithWorldPos;
              varying vec3 vMonolithWorldNormal;
              ${shader.vertexShader}
            `;
            shader.vertexShader = shader.vertexShader.replace(
              '#include <begin_vertex>',
              `
              #include <begin_vertex>
              vMonolithWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
              vMonolithWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
              `
            );

            shader.fragmentShader = `
              uniform float uTime;
              uniform float uZ1Rms;
              uniform float uZ2Rms;
              uniform float uZ2Trans;
              uniform float uZ3Rms;
              uniform float uZ3Trans;
              uniform float uZ4Rms;
              uniform float uZ4Trans;
              uniform float uZ5Rms;
              uniform float uZ5Trans;
              uniform float uZ7Rms;
              varying vec3 vMonolithWorldPos;
              varying vec3 vMonolithWorldNormal;
              ${shader.fragmentShader}
            `;

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              float wx = vMonolithWorldPos.x;
              float wy = vMonolithWorldPos.y;
              float wz = vMonolithWorldPos.z;

              bool isLeft = wx < 0.8045;

              // Facing angles
              vec3 viewDir = normalize(cameraPosition - vMonolithWorldPos);
              float fresnel = pow(1.0 - max(dot(viewDir, vMonolithWorldNormal), 0.0), 2.8);

              // Vector toward portal singularity
              vec3 toPortal = normalize(vec3(0.8045, 2.26, -5.74) - vMonolithWorldPos);
              float portalFacing = clamp(dot(vMonolithWorldNormal, toPortal), 0.0, 1.0);

              // Spatial Zone Color Tint:
              // Left: Deep royal purple (#9333ea) to hot magenta (#e11d48)
              // Right: Electric cyan (#00f0ff) to sapphire blue (#2563eb)
              vec3 cPurple = vec3(0.65, 0.15, 0.95);
              vec3 cMagenta = vec3(0.92, 0.12, 0.55);
              vec3 cCyan = vec3(0.00, 0.85, 1.00);
              vec3 cBlue = vec3(0.12, 0.40, 0.95);

              float depthMix = clamp((-wz - 0.5) / 4.5, 0.0, 1.0);

              vec3 zoneColor = vec3(0.0);
              float zoneEnergy = 0.0;

              if (isLeft) {
                float eFar = uZ2Rms * 2.2 + uZ2Trans * 2.0;
                float eNear = uZ4Rms * 1.8 + uZ4Trans * 1.6;
                zoneEnergy = mix(eNear, eFar, depthMix);
                zoneColor = mix(cPurple, cMagenta, clamp(uZ2Trans * 0.8, 0.0, 1.0));
              } else {
                float eFar = uZ3Rms * 2.2 + uZ3Trans * 2.0;
                float eNear = uZ5Rms * 1.8 + uZ5Trans * 1.6;
                zoneEnergy = mix(eNear, eFar, depthMix);
                zoneColor = mix(cBlue, cCyan, clamp(uZ3Trans * 0.8, 0.0, 1.0));
              }

              // Top spire aura (Zone 7 Choir / Strings)
              if (wy > 2.2) {
                float heightFactor = clamp((wy - 2.2) / 3.0, 0.0, 1.0);
                vec3 cZenith = vec3(0.68, 0.25, 0.98);
                zoneColor += cZenith * (uZ7Rms * 2.0 * heightFactor);
                zoneEnergy += uZ7Rms * 1.2 * heightFactor;
              }

              // Emissive coupling: rim fresnel + portal light + stem energy
              float surfaceLuminance = (fresnel * 0.85 + portalFacing * 0.45) * zoneEnergy;
              vec3 rockEmissive = zoneColor * surfaceLuminance;

              // Transients add subtle white-hot rim glint
              float trans = isLeft ? uZ2Trans : uZ3Trans;
              if (trans > 0.35) {
                rockEmissive += vec3(0.9, 0.9, 1.0) * pow(trans, 2.0) * fresnel * 0.8;
              }

              totalEmissiveRadiance += rockEmissive;
              `
            );
          };

          obj.material = monolithMat;
          obj.castShadow = true;
          obj.receiveShadow = true;
          break;
        }

        case 'Sphere': {
          const skyMat = new THREE.MeshStandardMaterial({
            map: bgTex,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.BackSide,
          });

          skyMat.onBeforeCompile = (shader) => {
            shader.uniforms.uZ7Rms = uniformsRef.current.uZ7Rms;
            shader.fragmentShader = `
              uniform float uZ7Rms;
              ${shader.fragmentShader}
            `;
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <emissivemap_fragment>',
              `
              #include <emissivemap_fragment>
              // Subtle breathing atmosphere on strings & synth choir
              vec3 vaultAura = vec3(0.35, 0.10, 0.60) * (uZ7Rms * 0.6);
              totalEmissiveRadiance += vaultAura;
              `
            );
          };

          obj.material = skyMat;
          break;
        }

        default:
          (obj.material as THREE.MeshStandardMaterial).roughness = 0.7;
      }
    });

    // Notify capture runner that stage geometry and textures are mounted
    (window as any).__IS_STAGE_LOADED__ = true;
  }, [fbx, circleTex, bgTex]);

  return (
    <>
      <primitive object={fbx} scale={0.01} />

      {/* High-Precision Planar Ray-Traced Floor Reflections */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.8045, 0.005, -1.0]}
        receiveShadow
      >
        <planeGeometry args={[35, 45]} />
        <MeshReflectorMaterial
          ref={reflectorRef}
          blur={REFLECTOR_BLUR}
          resolution={2048}
          mixBlur={0.85}
          mixStrength={1.4}
          roughness={0.30}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0c0914"
          metalness={0.45}
          mirror={0.45}
          distortionMap={floorNormal}
          distortion={0.32}
          normalMap={floorNormal}
          normalScale={REFLECTOR_NORMAL_SCALE}
          roughnessMap={floorRough}
          map={floorColor}
        />
      </mesh>

      {/* Atmospheric Cavern Hemisphere Light (purple sky fill / midnight ground bounce) */}
      <hemisphereLight color="#3b0764" groundColor="#0a0515" intensity={0.20} />

      {/* Overhead Directional Rim & Contact Grounding Shadow Light */}
      <directionalLight
        position={[0.8, 12.0, 1.5]}
        intensity={0.65}
        color="#c084fc"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.0001}
      />

      {/* ── 7 Native Physical 3D Spatial Zone Lights (decay=2 quadratic physical dropoff) ── */}

      {/* Zone 1: Center Portal Singularity Light (Lead Vocals + Kick transient) */}
      <pointLight
        ref={z1LightRef}
        position={[0.8045, 2.2619, -5.7402]}
        color="#f43f5e"
        intensity={4.8}
        distance={35}
        decay={2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-radius={3.5}
        shadow-bias={-0.0001}
      />

      {/* Zone 2: Deep Left Monoliths (GTR1, SYN1, SYN3, BGV1) */}
      <pointLight
        ref={z2LightRef}
        position={[-2.2, 2.8, -3.0]}
        color="#a855f7"
        intensity={2.8}
        distance={30}
        decay={2}
      />

      {/* Zone 3: Deep Right Monoliths (GTR2, SYN2, SYN4, BGV2) */}
      <pointLight
        ref={z3LightRef}
        position={[2.6, 2.8, -3.0]}
        color="#06b6d4"
        intensity={3.2}
        distance={30}
        decay={2}
      />

      {/* Zone 4: Foreground Left Pillars (CLAPS, FILLS, BGV3, FX) */}
      <pointLight
        ref={z4LightRef}
        position={[-2.2, 1.8, 0.5]}
        color="#a855f7"
        intensity={1.6}
        distance={16}
        decay={2}
      />

      {/* Zone 5: Foreground Right Pillars (HATS, VOCODER, VOX FX, GTR3) */}
      <pointLight
        ref={z5LightRef}
        position={[3.6, 1.8, 0.5]}
        color="#38bdf8"
        intensity={1.6}
        distance={16}
        decay={2}
      />

      {/* Zone 6: Floor Walkway Bed (Sub-Bass 1-6, bass, LOOPS) */}
      <pointLight
        ref={z6LightRef}
        position={[0.8045, 0.20, -2.5]}
        color="#0369a1"
        intensity={2.6}
        distance={20}
        decay={2}
      />

      {/* Zone 7: Cavern Vault / Sky Dome (STRINGS, SYN CHOIR, ADLIBS) */}
      <pointLight
        ref={z7LightRef}
        position={[0.8, 8.5, -1.5]}
        color="#581c87"
        intensity={1.4}
        distance={30}
        decay={2}
      />

      <StageAnimator
        ringRef={ringRef}
        reflectorRef={reflectorRef}
        z1LightRef={z1LightRef}
        z2LightRef={z2LightRef}
        z3LightRef={z3LightRef}
        z4LightRef={z4LightRef}
        z5LightRef={z5LightRef}
        z6LightRef={z6LightRef}
        z7LightRef={z7LightRef}
        uniformsRef={uniformsRef}
        zonesRef={props.zonesRef}
      />
    </>
  );
});

export const NeonStage: React.FC<NeonStageProps> = React.memo((props) => {
  return (
    <>
      {/* Cavern ambient base fill */}
      <ambientLight intensity={0.25} color="#3b1368" />

      <Suspense fallback={null}>
        <StageModel {...props} />
      </Suspense>
    </>
  );
});

