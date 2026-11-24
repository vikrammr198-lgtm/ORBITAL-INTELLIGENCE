import React, { useMemo, useState } from 'react';
import {
  Brain,
  Camera,
  Eye,
  Info,
  Pause,
  Play,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import { EarthScene, type CameraPreset } from '../EarthScene';
import type { OrbitalSceneItem } from '../../types/orbital';

interface OrbitalMonitorProps {
  scenes: OrbitalSceneItem[];
  visualizationNote: string;
  selectedEventId: number | null;
  onSelectEvent: (eventId: number) => void;
  onPredictEvent: (eventId: number) => void;
  loading: boolean;
}

export const OrbitalMonitor: React.FC<OrbitalMonitorProps> = ({
  scenes,
  visualizationNote,
  selectedEventId,
  onSelectEvent,
  onPredictEvent,
  loading,
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('global');
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);
  const [showClouds, setShowClouds] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const selectedScene = useMemo(
    () => scenes.find((s) => s.event_id === selectedEventId) ?? scenes[0] ?? null,
    [scenes, selectedEventId]
  );

  return (
    <div className="space-y-4">
      {/* Explicit Simulated Visualization Disclosure Banner */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-2.5 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-100/90 leading-relaxed">
          <span className="font-mono-tech font-semibold text-amber-300 mr-1.5">
            SIMULATED 3D TRAJECTORY GEOMETRY:
          </span>
          {visualizationNote ||
            'Orbital SMA, eccentricity, inclination, apogee/perigee, miss distance, and risk are actual ESA CDM values. RAAN and orbital phase angles are deterministically simulated for 3D Earth visualization.'}
        </p>
      </div>

      {/* Controls Bar */}
      <div className="glass-panel rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 px-3 py-1.5 text-xs font-medium text-cyan-100 transition cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause Orbit' : 'Resume Orbit'}
          </button>

          <div className="flex items-center rounded-lg bg-slate-900/80 border border-slate-700/60 p-0.5">
            {[1, 3, 8].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono-tech transition cursor-pointer ${
                  speedMultiplier === spd
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Camera Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {(
            [
              ['global', 'Global'],
              ['equatorial', 'Equatorial'],
              ['polar', 'Polar'],
              ['conjunction', 'Conjunction Lock'],
            ] as Array<[CameraPreset, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setCameraPreset(id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                cameraPreset === id
                  ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/45'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-700/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {[
            ['Orbits', showOrbits, setShowOrbits],
            ['Atmosphere', showAtmosphere, setShowAtmosphere],
            ['Clouds', showClouds, setShowClouds],
            ['Labels', showLabels, setShowLabels],
          ].map(([label, active, setter]) => (
            <button
              key={label as string}
              onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-tech transition cursor-pointer ${
                active
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                  : 'bg-slate-900/70 text-slate-500 border border-slate-800'
              }`}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Theater + Right Telemetry Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 relative">
          {loading && scenes.length === 0 ? (
            <div className="h-[580px] rounded-2xl bg-slate-900/60 border border-cyan-500/15 animate-pulse flex items-center justify-center text-slate-400 font-mono-tech text-sm">
              Loading Orbital Telemetry...
            </div>
          ) : (
            <EarthScene
              scenes={scenes}
              selectedEventId={selectedScene?.event_id ?? null}
              onSelectEvent={onSelectEvent}
              cameraPreset={cameraPreset}
              isPlaying={isPlaying}
              speedMultiplier={speedMultiplier}
              showOrbits={showOrbits}
              showAtmosphere={showAtmosphere}
              showClouds={showClouds}
              showLabels={showLabels}
            />
          )}

          {/* Legend Overlay */}
          <div className="mt-3 flex flex-wrap items-center gap-4 px-2 text-xs font-mono-tech text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Target Satellite Orbit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> High-Risk Chaser / Debris Orbit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Low-Risk Chaser Orbit
            </span>
          </div>
        </div>

        {/* Right Side: Selected Conjunction Telemetry & Selector */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          {selectedScene && (
            <div
              className={`rounded-2xl p-5 ${
                selectedScene.high_risk === 1 ? 'glass-panel-danger' : 'glass-panel'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-mono-tech uppercase tracking-widest text-slate-400">
                    Active Conjunction Pair
                  </span>
                  <h3 className="text-xl font-bold font-display text-white">
                    Event #{selectedScene.event_id}
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono-tech font-bold inline-flex items-center gap-1.5 ${
                    selectedScene.high_risk === 1
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                      : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35'
                  }`}
                >
                  {selectedScene.high_risk === 1 && <ShieldAlert className="w-3.5 h-3.5" />}
                  {selectedScene.high_risk === 1 ? 'HIGH RISK' : 'LOW RISK'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-mono-tech">
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                  <span className="text-slate-500 block">MISS DISTANCE</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedScene.miss_distance?.toLocaleString() ?? '—'} m
                  </span>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                  <span className="text-slate-500 block">REL SPEED</span>
                  <span className="text-sm font-semibold text-white">
                    {selectedScene.relative_speed?.toLocaleString() ?? '—'} m/s
                  </span>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                  <span className="text-slate-500 block">TIME TO TCA</span>
                  <span className="text-sm font-semibold text-cyan-300">
                    {selectedScene.time_to_tca.toFixed(3)} days
                  </span>
                </div>
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                  <span className="text-slate-500 block">CHASER TYPE</span>
                  <span className="text-sm font-semibold text-amber-200">
                    {selectedScene.c_object_type}
                  </span>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs font-mono-tech space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Orbit (SMA / INC / ECC):</span>
                  <span className="text-sky-300">
                    {selectedScene.t_j2k_sma?.toFixed(1) ?? '—'} km ·{' '}
                    {selectedScene.t_j2k_inc?.toFixed(2) ?? '—'}° ·{' '}
                    {selectedScene.t_j2k_ecc?.toFixed(4) ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chaser Orbit (SMA / INC / ECC):</span>
                  <span className="text-rose-300">
                    {selectedScene.c_j2k_sma?.toFixed(1) ?? '—'} km ·{' '}
                    {selectedScene.c_j2k_inc?.toFixed(2) ?? '—'}° ·{' '}
                    {selectedScene.c_j2k_ecc?.toFixed(4) ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RTN ΔPos (m):</span>
                  <span className="text-slate-200">
                    [{selectedScene.relative_position_r?.toFixed(0) ?? '—'},{' '}
                    {selectedScene.relative_position_t?.toFixed(0) ?? '—'},{' '}
                    {selectedScene.relative_position_n?.toFixed(0) ?? '—'}]
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sim RAAN / Phase:</span>
                  <span className="text-amber-300">
                    {selectedScene.simulated_raan_deg}° / {selectedScene.simulated_phase_deg}°
                  </span>
                </div>
              </div>

              <button
                onClick={() => onPredictEvent(selectedScene.event_id)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 text-sm transition shadow-[0_0_24px_rgba(6,182,212,0.35)] cursor-pointer"
              >
                <Brain className="w-4 h-4" />
                Run XGBoost Prediction on EVT-{selectedScene.event_id}
              </button>
            </div>
          )}

          {/* Scene Selector List */}
          <div className="glass-panel rounded-2xl p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Radar className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold font-display text-white">
                Tracked Orbital Conjunctions ({scenes.length})
              </h4>
            </div>
            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {scenes.map((sc) => {
                const active = sc.event_id === selectedScene?.event_id;
                const isHR = sc.high_risk === 1;
                return (
                  <button
                    key={sc.event_id}
                    onClick={() => onSelectEvent(sc.event_id)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-mono-tech flex items-center justify-between transition cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isHR ? 'bg-rose-500' : 'bg-cyan-400'
                        }`}
                      />
                      EVT-{sc.event_id} · {sc.c_object_type}
                    </span>
                    <span className={isHR ? 'text-rose-300' : 'text-slate-400'}>
                      {sc.miss_distance?.toLocaleString() ?? '—'} m
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
