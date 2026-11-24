import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  FeatureFieldSchema,
  FeaturePreset,
  FeatureSchemaResponse,
  PredictionResponse,
} from '../../types/orbital';

interface RiskPredictorProps {
  schemaData: FeatureSchemaResponse | null;
  importedEventId: number | null;
  onClearImportedEvent: () => void;
}

type FeatureGroup = 'key' | 'target' | 'chaser' | 'covariance' | 'weather' | 'all';

const KEY_FEATURES = new Set([
  'time_to_tca',
  'mission_id',
  'risk',
  'max_risk_estimate',
  'max_risk_scaling',
  'miss_distance',
  'relative_speed',
  'mahalanobis_distance',
  'c_object_type',
  'geocentric_latitude',
  'azimuth',
  'elevation',
  'relative_position_r',
  'relative_position_t',
  'relative_position_n',
  'relative_velocity_r',
  'relative_velocity_t',
  'relative_velocity_n',
]);

const WEATHER_FEATURES = new Set(['F10', 'F3M', 'SSN', 'AP']);

function getGroup(name: string): FeatureGroup {
  if (KEY_FEATURES.has(name)) return 'key';
  if (WEATHER_FEATURES.has(name)) return 'weather';
  if (
    name.includes('sigma') ||
    name.includes('covariance') ||
    name.includes('_ct_') ||
    name.includes('_cn_') ||
    name.includes('_crdot') ||
    name.includes('_ctdot') ||
    name.includes('_cndot')
  ) {
    return 'covariance';
  }
  if (name.startsWith('t_')) return 'target';
  if (name.startsWith('c_')) return 'chaser';
  return 'key';
}

export const RiskPredictor: React.FC<RiskPredictorProps> = ({
  schemaData,
  importedEventId,
  onClearImportedEvent,
}) => {
  const [values, setValues] = useState<Record<string, number | string | null>>({});
  const [activeGroup, setActiveGroup] = useState<FeatureGroup>('key');
  const [featureSearch, setFeatureSearch] = useState('');
  const [activeSourceLabel, setActiveSourceLabel] = useState<string>('Training Median Baseline');
  const [groundTruthLabel, setGroundTruthLabel] = useState<number | null>(null);

  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults from schema medians
  const buildMedians = (schema: FeatureFieldSchema[]) => {
    const init: Record<string, number | string | null> = {};
    for (const f of schema) {
      init[f.name] = f.type === 'category' ? f.default ?? 'DEBRIS' : f.median ?? 0;
    }
    return init;
  };

  useEffect(() => {
    if (!schemaData) return;
    if (Object.keys(values).length === 0) {
      // Load first high-risk preset or medians on initial mount so user can test immediately
      setValues(buildMedians(schemaData.schema));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaData]);

  // If user navigated from Explorer or Monitor with an event ID, load all 102 features from backend
  useEffect(() => {
    if (importedEventId === null) return;
    let cancelled = false;
    setError(null);
    api
      .getEventDetail(importedEventId)
      .then((detail) => {
        if (cancelled) return;
        setValues(detail.features);
        setActiveSourceLabel(`ESA Dataset Event #${importedEventId}`);
        setGroundTruthLabel(detail.summary.high_risk);
        setResult(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load event features');
      });
    return () => {
      cancelled = true;
    };
  }, [importedEventId]);

  const loadPreset = (preset: FeaturePreset) => {
    onClearImportedEvent();
    setValues({ ...preset.features });
    setActiveSourceLabel(
      `Test Preset EVT-${preset.event_id} (Actual: ${
        preset.actual_high_risk === 1 ? 'HIGH RISK' : 'LOW RISK'
      })`
    );
    setGroundTruthLabel(preset.actual_high_risk);
    setResult(null);
    setError(null);
  };

  const resetToMedians = () => {
    if (!schemaData) return;
    onClearImportedEvent();
    setValues(buildMedians(schemaData.schema));
    setActiveSourceLabel('Training Median Baseline');
    setGroundTruthLabel(null);
    setResult(null);
    setError(null);
  };

  const handleFieldChange = (name: string, rawVal: string, type: 'number' | 'category') => {
    if (type === 'category') {
      setValues((prev) => ({ ...prev, [name]: rawVal }));
      return;
    }
    if (rawVal.trim() === '') {
      setValues((prev) => ({ ...prev, [name]: null }));
      return;
    }
    const parsed = Number(rawVal);
    if (!Number.isNaN(parsed)) {
      setValues((prev) => ({ ...prev, [name]: parsed }));
    }
  };

  const runPrediction = async () => {
    if (!schemaData) return;
    setPredicting(true);
    setError(null);
    try {
      // Ensure every one of the 102 required feature keys is present
      const payload: Record<string, number | string | null> = {};
      for (const col of schemaData.feature_columns) {
        payload[col] = col in values ? values[col] : null;
      }
      const res = await api.predict(payload);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  const visibleFields = useMemo(() => {
    if (!schemaData) return [];
    const q = featureSearch.trim().toLowerCase();
    return schemaData.schema.filter((f) => {
      if (q) return f.name.toLowerCase().includes(q);
      if (activeGroup === 'all') return true;
      return getGroup(f.name) === activeGroup;
    });
  }, [schemaData, activeGroup, featureSearch]);

  if (!schemaData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm font-mono-tech text-slate-400">
        Loading 102-feature XGBoost schema...
      </div>
    );
  }

  const thresholdPct = (schemaData.threshold * 100).toFixed(1);
  const probPct = result ? (result.high_risk_probability * 100).toFixed(2) : null;
  const isHighRisk = result?.predicted_class === 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Feature Presets & All 102 Input Controls */}
      <div className="xl:col-span-8 space-y-4">
        {/* Preset Selector Bar */}
        <div className="glass-panel rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold font-display text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Load Real Test-Set Conjunction Scenarios
              </h2>
              <p className="text-xs text-slate-400">
                Active Input Source:{' '}
                <span className="font-mono-tech text-cyan-300">{activeSourceLabel}</span>
              </p>
            </div>
            <button
              onClick={resetToMedians}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-mono-tech text-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Medians
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {schemaData.presets.map((p) => {
              const hr = p.actual_high_risk === 1;
              return (
                <button
                  key={p.event_id}
                  onClick={() => loadPreset(p)}
                  className={`text-left rounded-xl p-2.5 border transition cursor-pointer ${
                    hr
                      ? 'bg-rose-950/25 border-rose-500/35 hover:border-rose-400'
                      : 'bg-slate-900/60 border-slate-700/60 hover:border-cyan-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono-tech">
                    <span className="font-bold text-white">EVT-{p.event_id}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        hr ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/15 text-cyan-300'
                      }`}
                    >
                      {hr ? 'TRUE HIGH' : 'TRUE LOW'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono-tech text-slate-400">
                    {p.c_object_type} · {p.miss_distance.toLocaleString()} m · -{p.time_to_tca.toFixed(2)}d
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 102-Feature Editor */}
        <div className="glass-panel rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['key', 'Key Risk & RTN'],
                  ['target', 'Target (t_*)'],
                  ['chaser', 'Chaser (c_*)'],
                  ['covariance', 'Covariance'],
                  ['weather', 'Space Weather'],
                  ['all', `All (${schemaData.feature_columns.length})`],
                ] as Array<[FeatureGroup, string]>
              ).map(([grp, label]) => (
                <button
                  key={grp}
                  onClick={() => setActiveGroup(grp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    activeGroup === grp && !featureSearch
                      ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/50'
                      : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                placeholder="Filter 102 features..."
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/70 pl-8 pr-3 py-1.5 text-xs font-mono-tech text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {visibleFields.map((field) => {
              const val = values[field.name];
              return (
                <div
                  key={field.name}
                  className="rounded-xl bg-slate-950/60 border border-slate-800/90 p-2.5"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <label
                      htmlFor={`feat-${field.name}`}
                      className="text-[11px] font-mono-tech text-cyan-200 truncate"
                      title={field.name}
                    >
                      {field.name}
                    </label>
                    {field.type === 'number' && field.median !== undefined && (
                      <span className="text-[10px] font-mono-tech text-slate-500 shrink-0">
                        med {Math.abs(field.median) > 1e5 ? field.median.toExponential(1) : Number(field.median.toFixed(2))}
                      </span>
                    )}
                  </div>

                  {field.type === 'category' ? (
                    <select
                      id={`feat-${field.name}`}
                      value={String(val ?? field.default ?? 'DEBRIS')}
                      onChange={(e) => handleFieldChange(field.name, e.target.value, 'category')}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tech text-white focus:outline-none focus:border-cyan-400"
                    >
                      {(field.categories ?? ['DEBRIS', 'UNKNOWN', 'PAYLOAD', 'ROCKET BODY', 'TBA']).map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <input
                      id={`feat-${field.name}`}
                      type="number"
                      step="any"
                      value={val === null || val === undefined ? '' : String(val)}
                      placeholder="Null (median imputed)"
                      onChange={(e) => handleFieldChange(field.name, e.target.value, 'number')}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs font-mono-tech text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Execution & Prediction Output Panel */}
      <div className="xl:col-span-4 space-y-4">
        <div
          className={`rounded-2xl p-6 space-y-5 ${
            result
              ? isHighRisk
                ? 'glass-panel-danger'
                : 'glass-panel'
              : 'glass-panel'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono-tech uppercase tracking-widest text-cyan-300">
                FastAPI /predict Inference
              </span>
              <h3 className="text-xl font-bold font-display text-white">
                XGBoost Risk Predictor
              </h3>
            </div>
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>

          <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs font-mono-tech space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Model Artifact:</span>
              <span className="text-white">{schemaData.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Input Vector Size:</span>
              <span className="text-cyan-300">{schemaData.feature_columns.length} features</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Decision Threshold:</span>
              <span className="text-amber-300">{schemaData.threshold} ({thresholdPct}%)</span>
            </div>
          </div>

          <button
            onClick={runPrediction}
            disabled={predicting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold py-3 text-sm transition shadow-[0_0_28px_rgba(6,182,212,0.38)] cursor-pointer"
          >
            {predicting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Inference...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Predict Conjunction Risk
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 pt-2 border-t border-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tech uppercase text-slate-400">
                  Classification
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-tech font-bold ${
                    isHighRisk
                      ? 'bg-rose-500/25 text-rose-200 border border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                      : 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/50'
                  }`}
                >
                  {isHighRisk ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {result.classification}
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs font-mono-tech text-slate-400">
                    High-Risk Probability
                  </span>
                  <span
                    className={`text-3xl font-bold font-display ${
                      isHighRisk ? 'text-rose-400' : 'text-cyan-300'
                    }`}
                  >
                    {probPct}%
                  </span>
                </div>

                {/* Probability Gauge with 0.44 Threshold Marker */}
                <div className="relative h-4 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isHighRisk
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, result.high_risk_probability * 100)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-300 shadow-[0_0_8px_#fcd34d]"
                    style={{ left: `${result.threshold * 100}%` }}
                    title={`Decision Threshold ${result.threshold}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono-tech text-slate-500 mt-1">
                  <span>0.00</span>
                  <span className="text-amber-300">Threshold: {result.threshold}</span>
                  <span>1.00</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs font-mono-tech space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Raw Probability:</span>
                  <span className="text-white">{result.high_risk_probability}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Predicted Class:</span>
                  <span className="text-white">{result.predicted_class}</span>
                </div>
                {groundTruthLabel !== null && (
                  <div className="flex justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Actual Dataset Label:</span>
                    <span
                      className={
                        groundTruthLabel === 1 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                      }
                    >
                      {groundTruthLabel === 1 ? 'HIGH RISK (1)' : 'LOW RISK (0)'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
