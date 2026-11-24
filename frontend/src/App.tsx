import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Brain,
  Database,
  Globe2,
  Orbit,
  Radar,
  RefreshCw,
} from 'lucide-react';
import { api } from './services/api';
import type {
  AnalyticsResponse,
  FeatureSchemaResponse,
  HealthResponse,
  OrbitalSceneItem,
  OverviewResponse,
  SectionId,
} from './types/orbital';
import { MissionOverview } from './components/sections/MissionOverview';
import { OrbitalMonitor } from './components/sections/OrbitalMonitor';
import { ConjunctionExplorer } from './components/sections/ConjunctionExplorer';
import { RiskPredictor } from './components/sections/RiskPredictor';
import { AnalyticsSection } from './components/sections/AnalyticsSection';

const NAV_ITEMS: Array<{
  id: SectionId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Mission Overview', subtitle: 'Command & KPIs', icon: Globe2 },
  { id: 'monitor', label: 'Orbital Monitor', subtitle: '3D Conjunctions', icon: Radar },
  { id: 'explorer', label: 'Conjunction Explorer', subtitle: '11,942 ESA Events', icon: Database },
  { id: 'predictor', label: 'AI Risk Prediction', subtitle: 'XGBoost /predict', icon: Brain },
  { id: 'analytics', label: 'Analytics', subtitle: 'Metrics & Features', icon: BarChart3 },
];

export function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [scenes, setScenes] = useState<OrbitalSceneItem[]>([]);
  const [visualizationNote, setVisualizationNote] = useState('');
  const [schemaData, setSchemaData] = useState<FeatureSchemaResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [selectedMonitorEventId, setSelectedMonitorEventId] = useState<number | null>(null);
  const [importedPredictEventId, setImportedPredictEventId] = useState<number | null>(null);

  const [utcClock, setUtcClock] = useState(() => new Date().toISOString().slice(11, 19) + ' UTC');

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcClock(new Date().toISOString().slice(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadInitialData = async () => {
    setLoadingGlobal(true);
    setGlobalError(null);
    try {
      const [h, ov, sc, sch, an] = await Promise.all([
        api.getHealth(),
        api.getOverview(),
        api.getOrbitalScenes(),
        api.getFeatureSchema(),
        api.getAnalytics(),
      ]);
      setHealth(h);
      setOverview(ov);
      setScenes(sc.scenes);
      setVisualizationNote(sc.visualization_note);
      setSchemaData(sch);
      setAnalytics(an);
      if (sc.scenes.length > 0 && selectedMonitorEventId === null) {
        setSelectedMonitorEventId(sc.scenes[0].event_id);
      }
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'Unable to reach FastAPI backend on port 8000'
      );
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInspectInMonitor = (eventId: number) => {
    setSelectedMonitorEventId(eventId);
    setActiveSection('monitor');
  };

  const handlePredictEvent = (eventId: number) => {
    setImportedPredictEventId(eventId);
    setActiveSection('predictor');
  };

  return (
    <div className="min-h-screen hud-grid-bg flex flex-col">
      {/* Top Aerospace Mission-Control Header */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/20 bg-[#030712]/90 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400/25 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Orbit className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold font-display tracking-wider text-white">
                  ORBITAL INTELLIGENCE
                </h1>
                <span className="hidden sm:inline-flex rounded bg-cyan-500/15 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-mono-tech text-cyan-300">
                  CONJUNCTION OPS
                </span>
              </div>
              <p className="text-[11px] font-mono-tech text-slate-400">
                Early Prediction of High-Risk Satellite Conjunctions · ESA CDM + XGBoost (τ=0.44)
              </p>
            </div>
          </div>

          {/* Live Status Telemetry Bar */}
          <div className="flex items-center gap-3 text-xs font-mono-tech">
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-slate-300">
              <Activity className={`w-3.5 h-3.5 ${health?.model_loaded ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>
                {health?.model_loaded
                  ? `API ONLINE · ${health.model} · ${health.feature_count}F`
                  : 'API OFFLINE'}
              </span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-1.5 text-cyan-300">
              {utcClock}
            </div>

            <button
              onClick={loadInitialData}
              title="Refresh Backend Telemetry"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 p-2 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingGlobal ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-2.5 flex items-center gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`group relative flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition shrink-0 cursor-pointer border ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-white shadow-[0_0_20px_rgba(6,182,212,0.18)]'
                    : 'bg-slate-950/40 border-slate-800/70 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    active ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'
                  }`}
                />
                <div>
                  <div className="text-xs font-semibold font-display leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[10px] font-mono-tech text-slate-500 leading-tight">
                    {item.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {globalError && (
          <div className="mb-5 glass-panel-danger rounded-2xl p-4 flex items-center justify-between gap-3 text-sm text-rose-200">
            <span>Backend connection error: {globalError}</span>
            <button
              onClick={loadInitialData}
              className="rounded-lg bg-rose-500/20 border border-rose-400/40 px-3 py-1 text-xs font-mono-tech cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeSection === 'overview' && (
              <MissionOverview
                overview={overview}
                health={health}
                scenes={scenes}
                loading={loadingGlobal}
                error={globalError}
                onNavigate={setActiveSection}
                onInspectInMonitor={handleInspectInMonitor}
                onPredictEvent={handlePredictEvent}
              />
            )}

            {activeSection === 'monitor' && (
              <OrbitalMonitor
                scenes={scenes}
                visualizationNote={visualizationNote}
                selectedEventId={selectedMonitorEventId}
                onSelectEvent={setSelectedMonitorEventId}
                onPredictEvent={handlePredictEvent}
                loading={loadingGlobal}
              />
            )}

            {activeSection === 'explorer' && (
              <ConjunctionExplorer
                onPredictEvent={handlePredictEvent}
                onInspectInMonitor={handleInspectInMonitor}
              />
            )}

            {activeSection === 'predictor' && (
              <RiskPredictor
                schemaData={schemaData}
                importedEventId={importedPredictEventId}
                onClearImportedEvent={() => setImportedPredictEventId(null)}
              />
            )}

            {activeSection === 'analytics' && (
              <AnalyticsSection
                analytics={analytics}
                loading={loadingGlobal}
                error={globalError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
