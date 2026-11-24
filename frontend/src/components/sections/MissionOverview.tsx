import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Database,
  Globe2,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import { EarthScene } from '../EarthScene';
import type {
  ConjunctionEvent,
  HealthResponse,
  OrbitalSceneItem,
  OverviewResponse,
  SectionId,
} from '../../types/orbital';

interface MissionOverviewProps {
  overview: OverviewResponse | null;
  health: HealthResponse | null;
  scenes: OrbitalSceneItem[];
  loading: boolean;
  error: string | null;
  onNavigate: (section: SectionId) => void;
  onInspectInMonitor: (eventId: number) => void;
  onPredictEvent: (eventId: number) => void;
}

export const MissionOverview: React.FC<MissionOverviewProps> = ({
  overview,
  health,
  scenes,
  loading,
  error,
  onNavigate,
  onInspectInMonitor,
  onPredictEvent,
}) => {
  const [selectedGlobeId, setSelectedGlobeId] = React.useState<number | null>(
    scenes[0]?.event_id ?? null
  );

  React.useEffect(() => {
    if (selectedGlobeId === null && scenes.length > 0) {
      setSelectedGlobeId(scenes[0].event_id);
    }
  }, [scenes, selectedGlobeId]);

  if (loading && !overview) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        <div className="lg:col-span-7 h-[520px] rounded-2xl bg-slate-900/60 border border-cyan-500/10" />
        <div className="lg:col-span-5 h-[520px] rounded-2xl bg-slate-900/60 border border-cyan-500/10" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="glass-panel-danger rounded-2xl p-6 text-rose-200 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <div>
          <p className="font-semibold">Telemetry Feed Unavailable</p>
          <p className="text-sm text-rose-300/80">{error}</p>
        </div>
      </div>
    );
  }

  const stats = overview?.stats;
  const modelInfo = overview?.model_info;
  const recentEvents: ConjunctionEvent[] = overview?.recent_events ?? [];

  return (
    <div className="space-y-6">
      {/* Top Telemetry KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="glass-panel rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs font-mono-tech uppercase tracking-wider text-cyan-300/80">
            <span>Early-Window Events</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-white">
              {stats ? stats.early_unique_events.toLocaleString() : '—'}
            </span>
            <span className="text-xs font-mono-tech text-slate-400">
              / {stats ? stats.raw_unique_events.toLocaleString() : '—'} total
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {stats ? stats.raw_total_cdms.toLocaleString() : '—'} ESA CDMs · {stats?.unique_missions ?? 19} missions (≥ 2d before TCA)
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="glass-panel-danger rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs font-mono-tech uppercase tracking-wider text-rose-300">
            <span>High-Risk Conjunctions</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-rose-400">
              {stats ? stats.early_high_risk_events.toLocaleString() : '—'}
            </span>
            <span className="text-xs font-mono-tech text-rose-300/80">
              ({stats?.early_high_risk_pct ?? 2.7}% early window)
            </span>
          </div>
          <p className="mt-2 text-xs text-rose-200/75">
            Final risk ≥ -6.0 (P<sub>c</sub> ≥ 10⁻⁶) · {stats?.raw_high_risk_events ?? 365} across full catalog
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="glass-panel rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs font-mono-tech uppercase tracking-wider text-cyan-300/80">
            <span>Active ML Engine</span>
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-white">
              {modelInfo?.model_name ?? 'XGBoost'}
            </span>
            <span className="text-xs font-mono-tech text-emerald-400">
              τ = {modelInfo?.threshold ?? 0.44}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {modelInfo?.raw_feature_count ?? 102} raw features → {modelInfo?.transformed_feature_count ?? 106} pipeline features
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="glass-panel rounded-2xl p-5"
        >
          <div className="flex items-center justify-between text-xs font-mono-tech uppercase tracking-wider text-cyan-300/80">
            <span>System Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            <span className="text-2xl font-bold font-display text-emerald-300">
              {health?.model_loaded ? 'ONLINE' : 'DEGRADED'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            FastAPI inference & {health?.events_loaded?.toLocaleString() ?? '—'} CDM records ready
          </p>
        </motion.div>
      </div>

      {/* Main Hero Grid: Interactive 3D Earth + Recent Critical Events */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-panel rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-semibold font-display tracking-wide text-white">
                  Global Conjunction Theater
                </h2>
                <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono-tech text-amber-300">
                  SIMULATED 3D PLANES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag to orbit · Scroll to zoom · Click any beacon to highlight orbital pair
              </p>
            </div>
            <button
              onClick={() => onNavigate('monitor')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 px-3 py-1.5 text-xs font-medium text-cyan-200 transition cursor-pointer"
            >
              <Radar className="w-3.5 h-3.5" />
              Open Full Monitor
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <EarthScene
            scenes={scenes}
            selectedEventId={selectedGlobeId}
            onSelectEvent={(id) => setSelectedGlobeId(id)}
            compact
            showLabels
          />
        </div>

        {/* Critical & Recent Events Feed */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold font-display text-white">
                Priority Conjunction Feed
              </h2>
              <p className="text-xs text-slate-400">
                Top high-risk & closest-approach events from ESA dataset
              </p>
            </div>
            <button
              onClick={() => onNavigate('explorer')}
              className="text-xs font-mono-tech text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
            >
              View All 11,942 <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[455px] pr-1">
            {recentEvents.map((ev) => {
              const isHR = ev.high_risk === 1;
              return (
                <div
                  key={ev.event_id}
                  className={`rounded-xl p-3 border transition ${
                    isHR
                      ? 'bg-rose-950/25 border-rose-500/30 hover:border-rose-400/60'
                      : 'bg-slate-900/50 border-slate-700/50 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold ${
                          isHR
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {isHR ? 'HIGH RISK' : 'LOW RISK'}
                      </span>
                      <span className="font-mono-tech text-sm font-semibold text-white">
                        EVT-{ev.event_id}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono-tech">
                        M{ev.mission_id} · {ev.c_object_type}
                      </span>
                    </div>
                    <span className="text-xs font-mono-tech text-slate-300">
                      TCA -{ev.time_to_tca.toFixed(2)}d
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-mono-tech text-slate-300">
                    <div>
                      <span className="text-slate-500 block">MISS DIST</span>
                      {ev.miss_distance !== null ? `${ev.miss_distance.toLocaleString()} m` : '—'}
                    </div>
                    <div>
                      <span className="text-slate-500 block">EARLY RISK</span>
                      {ev.risk.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-slate-500 block">FINAL RISK</span>
                      <span className={isHR ? 'text-rose-400 font-semibold' : 'text-cyan-300'}>
                        {ev.final_risk.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => onInspectInMonitor(ev.event_id)}
                      className="flex-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 py-1 text-[11px] font-medium text-slate-200 transition cursor-pointer"
                    >
                      3D Orbit View
                    </button>
                    <button
                      onClick={() => onPredictEvent(ev.event_id)}
                      className="flex-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 py-1 text-[11px] font-medium text-cyan-200 transition cursor-pointer"
                    >
                      Run AI Predictor
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
