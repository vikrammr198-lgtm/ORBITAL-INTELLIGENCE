import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitalSceneItem } from '../types/orbital';

export type CameraPreset = 'global' | 'equatorial' | 'polar' | 'conjunction';

interface EarthSceneProps {
  scenes: OrbitalSceneItem[];
  selectedEventId?: number | null;
  onSelectEvent?: (eventId: number) => void;
  cameraPreset?: CameraPreset;
  isPlaying?: boolean;
  speedMultiplier?: number;
  showOrbits?: boolean;
  showAtmosphere?: boolean;
  showClouds?: boolean;
  showLabels?: boolean;
  compact?: boolean;
}

const EARTH_RADIUS = 2.0;
const EARTH_KM = 6371;

// Procedural multi-octave hash noise for realistic Earth continents, bathymetry, and clouds
function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function buildEarthTextures() {
  const width = 1024;
  const height = 512;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(width, height);

  const specCanvas = document.createElement('canvas');
  specCanvas.width = width;
  specCanvas.height = height;
  const sCtx = specCanvas.getContext('2d')!;
  const sImg = sCtx.createImageData(width, height);

  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  const cCtx = cloudCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(width, height);

  for (let py = 0; py < height; py++) {
    const v = py / height;
    const lat = (0.5 - v) * Math.PI; // -pi/2 to pi/2
    const absLat = Math.abs(lat) / (Math.PI / 2);

    for (let px = 0; px < width; px++) {
      const u = px / width;
      const lon = u * Math.PI * 2;
      // Seamless spherical-ish projection coordinates
      const nx = Math.cos(lon) * Math.cos(lat) * 2.1 + 4.2;
      const ny = Math.sin(lon) * Math.cos(lat) * 2.1 + 3.7;
      const nz = Math.sin(lat) * 2.1 + 5.1;

      const n1 = fbm(nx + nz * 0.45, ny - nz * 0.35, 5);
      const n2 = fbm(nx * 2.4 + 10, ny * 2.4 + 10, 4);
      const continent = n1 * 0.72 + n2 * 0.28;

      const idx = (py * width + px) * 4;

      // Polar caps
      const iceThreshold = 0.84 - (continent - 0.5) * 0.14;
      if (absLat > iceThreshold) {
        aImg.data[idx] = 224;
        aImg.data[idx + 1] = 236;
        aImg.data[idx + 2] = 248;
        aImg.data[idx + 3] = 255;
        sImg.data[idx] = sImg.data[idx + 1] = sImg.data[idx + 2] = 110;
        sImg.data[idx + 3] = 255;
      } else if (continent > 0.535) {
        // Landmass with coastal greens, arid belts, and alpine ridges
        const elev = Math.min(1, (continent - 0.535) / 0.28);
        const arid = Math.max(0, 1 - Math.abs(absLat - 0.28) * 4.5);
        const r = Math.round(32 + elev * 95 + arid * 65);
        const g = Math.round(68 + (1 - arid * 0.5) * 52 + elev * 42);
        const b = Math.round(44 + elev * 34 + arid * 12);
        aImg.data[idx] = Math.min(255, r);
        aImg.data[idx + 1] = Math.min(255, g);
        aImg.data[idx + 2] = Math.min(255, b);
        aImg.data[idx + 3] = 255;
        sImg.data[idx] = sImg.data[idx + 1] = sImg.data[idx + 2] = 18;
        sImg.data[idx + 3] = 255;
      } else {
        // Deep ocean bathymetry + continental shelf glow
        const depth = Math.max(0, Math.min(1, (0.535 - continent) / 0.24));
        const shelf = Math.pow(1 - depth, 2.2);
        aImg.data[idx] = Math.round(7 + shelf * 22);
        aImg.data[idx + 1] = Math.round(28 + shelf * 68);
        aImg.data[idx + 2] = Math.round(74 + shelf * 78);
        aImg.data[idx + 3] = 255;
        sImg.data[idx] = sImg.data[idx + 1] = sImg.data[idx + 2] = 175;
        sImg.data[idx + 3] = 255;
      }

      // Clouds
      const cloudN = fbm(nx * 1.9 + 21.3, ny * 1.9 + nz * 1.1, 4);
      const cloudAlpha = Math.max(0, Math.min(255, (cloudN - 0.51) * 620));
      cImg.data[idx] = 230;
      cImg.data[idx + 1] = 242;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.round(cloudAlpha * 0.58);
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  sCtx.putImageData(sImg, 0, 0);
  cCtx.putImageData(cImg, 0, 0);

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  const specTex = new THREE.CanvasTexture(specCanvas);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);

  return { albedoTex, specTex, cloudTex };
}

function smaToSceneRadius(smaKm: number | null): number {
  const sma = smaKm && smaKm > EARTH_KM ? smaKm : EARTH_KM + 650;
  const altKm = Math.max(250, sma - EARTH_KM);
  // Compressed aerospace visual scale so LEO (400-1400km) and MEO/GEO remain clearly legible around Earth
  return EARTH_RADIUS + 0.28 + Math.min(1.85, Math.pow(altKm / 1200, 0.55) * 0.72);
}

function buildOrbitPoints(
  smaKm: number | null,
  ecc: number | null,
  incDeg: number | null,
  raanDeg: number,
  segments = 128
): THREE.Vector3[] {
  const a = smaToSceneRadius(smaKm);
  const e = Math.min(0.28, Math.max(0.001, ecc ?? 0.005));
  const inc = THREE.MathUtils.degToRad(incDeg ?? 53);
  const raan = THREE.MathUtils.degToRad(raanDeg);

  const euler = new THREE.Euler(inc, raan, 0, 'YXZ');
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const v = new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
    v.applyEuler(euler);
    pts.push(v);
  }
  return pts;
}

function getOrbitPositionAt(
  smaKm: number | null,
  ecc: number | null,
  incDeg: number | null,
  raanDeg: number,
  phaseRad: number
): THREE.Vector3 {
  const a = smaToSceneRadius(smaKm);
  const e = Math.min(0.28, Math.max(0.001, ecc ?? 0.005));
  const inc = THREE.MathUtils.degToRad(incDeg ?? 53);
  const raan = THREE.MathUtils.degToRad(raanDeg);
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(phaseRad));
  const v = new THREE.Vector3(r * Math.cos(phaseRad), 0, r * Math.sin(phaseRad));
  v.applyEuler(new THREE.Euler(inc, raan, 0, 'YXZ'));
  return v;
}

const AtmosphereGlow: React.FC = () => {
  const shaderMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color('#38bdf8') },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPositionNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying vec3 vNormal;
          varying vec3 vPositionNormal;
          void main() {
            float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.2);
            gl_FragColor = vec4(glowColor, 1.0) * intensity * 1.15;
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  return (
    <mesh material={shaderMat} scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
    </mesh>
  );
};

interface SatelliteMeshProps {
  position: THREE.Vector3;
  color: string;
  isHighRisk: boolean;
  isSelected: boolean;
  label?: string;
  showLabel?: boolean;
  onClick?: () => void;
}

const SatelliteMesh: React.FC<SatelliteMeshProps> = ({
  position,
  color,
  isHighRisk,
  isSelected,
  label,
  showLabel,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  const scale = isSelected ? 1.45 : 1.0;

  return (
    <group position={position} ref={groupRef} scale={[scale, scale, scale]} onClick={onClick}>
      {/* Spacecraft bus */}
      <mesh>
        <boxGeometry args={[0.045, 0.045, 0.065]} />
        <meshStandardMaterial color={isHighRisk ? '#fb7185' : '#e2e8f0'} metalness={0.75} roughness={0.25} />
      </mesh>
      {/* Solar array wings */}
      <mesh position={[0.085, 0, 0]}>
        <boxGeometry args={[0.1, 0.006, 0.036]} />
        <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.45} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[-0.085, 0, 0]}>
        <boxGeometry args={[0.1, 0.006, 0.036]} />
        <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.45} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Telemetry beacon */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {isSelected && (
        <mesh>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} wireframe />
        </mesh>
      )}
      {showLabel && label && (
        <Html distanceFactor={8} position={[0, 0.14, 0]} center>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className={`cursor-pointer whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-mono-tech font-semibold tracking-wider border backdrop-blur-md transition ${
              isHighRisk
                ? 'bg-rose-950/90 border-rose-500/70 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.45)]'
                : 'bg-slate-950/85 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

interface ConjunctionPairProps {
  item: OrbitalSceneItem;
  index: number;
  isSelected: boolean;
  isPlaying: boolean;
  speedMultiplier: number;
  showOrbits: boolean;
  showLabels: boolean;
  onSelect?: (eventId: number) => void;
}

const ConjunctionPair: React.FC<ConjunctionPairProps> = ({
  item,
  index,
  isSelected,
  isPlaying,
  speedMultiplier,
  showOrbits,
  showLabels,
  onSelect,
}) => {
  const targetOrbit = useMemo(
    () => buildOrbitPoints(item.t_j2k_sma, item.t_j2k_ecc, item.t_j2k_inc, item.simulated_raan_deg),
    [item]
  );

  // Chaser orbit crosses target orbit near the simulated conjunction phase
  const chaserRaan = (item.simulated_raan_deg + (item.high_risk ? 26 : 44)) % 360;
  const chaserOrbit = useMemo(
    () => buildOrbitPoints(item.c_j2k_sma, item.c_j2k_ecc, item.c_j2k_inc, chaserRaan),
    [item, chaserRaan]
  );

  const phaseRef = useRef(THREE.MathUtils.degToRad(item.simulated_phase_deg));
  const [tick, setTick] = React.useState(0);

  useFrame((_, delta) => {
    if (isPlaying) {
      phaseRef.current += delta * (0.14 + (index % 5) * 0.025) * speedMultiplier;
      setTick((t) => (t + 1) % 100000);
    }
  });

  // Keep positions memoized per animation tick
  const targetPos = useMemo(
    () =>
      getOrbitPositionAt(
        item.t_j2k_sma,
        item.t_j2k_ecc,
        item.t_j2k_inc,
        item.simulated_raan_deg,
        phaseRef.current
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, tick]
  );

  const chaserPos = useMemo(() => {
    const offset = item.high_risk ? 0.09 : 0.34;
    return getOrbitPositionAt(
      item.c_j2k_sma,
      item.c_j2k_ecc,
      item.c_j2k_inc,
      chaserRaan,
      phaseRef.current + offset
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, chaserRaan, tick]);

  const isHR = item.high_risk === 1;
  const targetColor = '#38bdf8';
  const chaserColor = isHR ? '#f43f5e' : '#94a3b8';

  return (
    <group>
      {showOrbits && (
        <>
          <Line
            points={targetOrbit}
            color={isSelected ? '#38bdf8' : isHR ? '#0ea5e9' : '#1e3a5f'}
            lineWidth={isSelected ? 2.1 : 0.85}
            transparent
            opacity={isSelected ? 0.92 : isHR ? 0.48 : 0.22}
          />
          {(isSelected || isHR) && (
            <Line
              points={chaserOrbit}
              color={isHR ? '#f43f5e' : '#64748b'}
              lineWidth={isSelected ? 1.8 : 0.75}
              transparent
              opacity={isSelected ? 0.85 : 0.35}
              dashed
              dashSize={0.08}
              gapSize={0.06}
            />
          )}
        </>
      )}

      <SatelliteMesh
        position={targetPos}
        color={targetColor}
        isHighRisk={false}
        isSelected={isSelected}
        label={isSelected ? `EVT-${item.event_id} TARGET` : isHR ? `EVT-${item.event_id}` : undefined}
        showLabel={showLabels && (isSelected || isHR)}
        onClick={() => onSelect?.(item.event_id)}
      />

      {(isSelected || isHR) && (
        <SatelliteMesh
          position={chaserPos}
          color={chaserColor}
          isHighRisk={isHR}
          isSelected={isSelected}
          label={isSelected ? `${item.c_object_type}` : undefined}
          showLabel={showLabels && isSelected}
          onClick={() => onSelect?.(item.event_id)}
        />
      )}

      {isSelected && (
        <Line
          points={[targetPos, chaserPos]}
          color={isHR ? '#fb7185' : '#38bdf8'}
          lineWidth={1.6}
          dashed
          dashSize={0.05}
          gapSize={0.03}
        />
      )}
    </group>
  );
};

const CameraRig: React.FC<{
  preset: CameraPreset;
  selectedScene?: OrbitalSceneItem;
}> = ({ preset, selectedScene }) => {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (preset === 'global') {
      targetVec.set(0, 2.2, 6.2);
    } else if (preset === 'equatorial') {
      targetVec.set(6.4, 0.25, 0.4);
    } else if (preset === 'polar') {
      targetVec.set(0.01, 6.8, 0.8);
    } else if (preset === 'conjunction' && selectedScene) {
      const p = getOrbitPositionAt(
        selectedScene.t_j2k_sma,
        selectedScene.t_j2k_ecc,
        selectedScene.t_j2k_inc,
        selectedScene.simulated_raan_deg,
        THREE.MathUtils.degToRad(selectedScene.simulated_phase_deg)
      );
      targetVec.copy(p).multiplyScalar(1.95).add(new THREE.Vector3(0, 0.85, 0.85));
    } else {
      targetVec.set(0, 2.2, 6.2);
    }

    camera.position.lerp(targetVec, Math.min(1, delta * 2.2));
  });

  return null;
};

const EarthSystem: React.FC<EarthSceneProps> = ({
  scenes,
  selectedEventId,
  onSelectEvent,
  cameraPreset = 'global',
  isPlaying = true,
  speedMultiplier = 1,
  showOrbits = true,
  showAtmosphere = true,
  showClouds = true,
  showLabels = true,
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const { albedoTex, specTex, cloudTex } = useMemo(() => buildEarthTextures(), []);

  useFrame((_, delta) => {
    if (isPlaying) {
      if (earthRef.current) earthRef.current.rotation.y += delta * 0.03 * speedMultiplier;
      if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.042 * speedMultiplier;
    }
  });

  const selectedScene = useMemo(
    () => scenes.find((s) => s.event_id === selectedEventId),
    [scenes, selectedEventId]
  );

  return (
    <>
      <ambientLight intensity={0.42} color="#93c5fd" />
      <directionalLight position={[10, 4, 8]} intensity={2.4} color="#fff7ed" />
      <directionalLight position={[-8, -4, -6]} intensity={0.45} color="#0ea5e9" />

      <Stars radius={90} depth={50} count={3200} factor={3.2} saturation={0.15} fade speed={0.4} />

      <group>
        {/* Earth Globe */}
        <mesh ref={earthRef}>
          <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
          <meshPhongMaterial
            map={albedoTex}
            specularMap={specTex}
            specular={new THREE.Color('#38bdf8')}
            shininess={22}
          />
        </mesh>

        {/* Cloud Layer */}
        {showClouds && (
          <mesh ref={cloudsRef} scale={[1.016, 1.016, 1.016]}>
            <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
            <meshLambertMaterial map={cloudTex} transparent opacity={0.85} depthWrite={false} />
          </mesh>
        )}

        {/* Atmospheric Rim Glow */}
        {showAtmosphere && <AtmosphereGlow />}

        {/* Equatorial Reference Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[EARTH_RADIUS + 0.08, EARTH_RADIUS + 0.095, 128]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>

        {/* Satellites & Conjunction Orbits */}
        {scenes.map((item, idx) => (
          <ConjunctionPair
            key={item.event_id}
            item={item}
            index={idx}
            isSelected={item.event_id === selectedEventId}
            isPlaying={isPlaying}
            speedMultiplier={speedMultiplier}
            showOrbits={showOrbits}
            showLabels={showLabels}
            onSelect={onSelectEvent}
          />
        ))}
      </group>

      {cameraPreset !== 'global' && <CameraRig preset={cameraPreset} selectedScene={selectedScene} />}
      <OrbitControls enablePan enableZoom minDistance={3.0} maxDistance={14} dampingFactor={0.08} enableDamping />
    </>
  );
};

export const EarthScene: React.FC<EarthSceneProps> = (props) => {
  return (
    <div className={`relative w-full ${props.compact ? 'h-[420px] lg:h-[520px]' : 'h-[540px] lg:h-[660px]'} rounded-2xl overflow-hidden bg-[#02050e] border border-cyan-500/20`}>
      <Canvas camera={{ position: [0, 2.2, 6.2], fov: 44 }} dpr={[1, 2]}>
        <color attach="background" args={['#02050e']} />
        <EarthSystem {...props} />
      </Canvas>
    </div>
  );
};
