import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Layers,
  Search,
  Trophy,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsResponse } from '../../types/orbital';

interface AnalyticsSectionProps {
  analytics: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  analytics,
  loading,
  error,
}) => {
  const [fiQuery, setFiQuery] = useState('');

  const top20Features = useMemo(
    () => (analytics?.feature_importance ?? []).slice(0, 20),
    [analytics]
  );

  const filteredFeatures = useMemo(() => {
    const all = analytics?.feature_importance ?? [];
    const q = fiQuery.trim().toLowerCase();
    return q ? all.filter((f) => f.feature.toLowerCase().includes(q)) : all;
  }, [analytics, fiQuery]);

  if (loading && !analytics) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-sm font-mono-tech text-slate-400">
        Loading model evaluation and feature importance analytics...
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="glass-panel-danger rounded-2xl p-6 text-rose-200 text-sm">{error}</div>
    );
  }

  if (!analytics) return null;

  const evalMetrics = analytics.final_test_evaluation;
  const cm = evalMetrics.confusion_matrix;

  return (
    <div className="space-y-6">
      {/* Final Test Evaluation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ['Accuracy', `${(evalMetrics.accuracy * 100).toFixed(2)}%`, 'Test (n=2,389)'],
          ['Recall (HR)', `${(evalMetrics.recall * 100).toFixed(2)}%`, '44 / 65 detected'],
          ['Precision (HR)', `${(evalMetrics.precision * 100).toFixed(2)}%`, 'Threshold 0.44'],
          ['F2 Score', evalMetrics.f2_score.toFixed(4), 'Primary optimization'],
          ['ROC-AUC', evalMetrics.roc_auc.toFixed(4), 'Ranking separation'],
          ['PR-AUC', evalMetrics.pr_auc.toFixed(4), 'Imbalanced AP'],
        ].map(([label, val, sub]) => (
          <div key={label} className="glass-panel rounded-2xl p-4">
            <span className="text-[11px] font-mono-tech uppercase tracking-wider text-cyan-300/80 block">
              {label}
            </span>
            <span className="text-2xl font-bold font-display text-white mt-1 block">{val}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">{sub}</span>
          </div>
        ))}
      </div>

      {/* Row 2: Confusion Matrix + Model Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold font-display text-white">
                Test Confusion Matrix
              </h3>
              <p className="text-xs text-slate-400">
                XGBoost on held-out test set ({evalMetrics.test_samples.toLocaleString()} events · τ ={' '}
                {evalMetrics.threshold})
              </p>
            </div>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-tech">
            <div />
            <div className="py-1.5 text-slate-400 font-semibold">Pred LOW (0)</div>
            <div className="py-1.5 text-slate-400 font-semibold">Pred HIGH (1)</div>

            <div className="flex items-center justify-end pr-2 text-slate-400 font-semibold">
              Actual LOW (0)
            </div>
            <div className="rounded-xl bg-cyan-500/15 border border-cyan-500/35 p-4">
              <span className="text-[10px] text-cyan-300 block">TRUE NEGATIVE</span>
              <span className="text-2xl font-bold text-white">{cm.tn.toLocaleString()}</span>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
              <span className="text-[10px] text-amber-300 block">FALSE POSITIVE</span>
              <span className="text-2xl font-bold text-amber-200">{cm.fp.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-end pr-2 text-slate-400 font-semibold">
              Actual HIGH (1)
            </div>
            <div className="rounded-xl bg-rose-950/40 border border-rose-500/30 p-4">
              <span className="text-[10px] text-rose-300 block">FALSE NEGATIVE</span>
              <span className="text-2xl font-bold text-rose-300">{cm.fn.toLocaleString()}</span>
            </div>
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/50 p-4">
              <span className="text-[10px] text-emerald-300 block">TRUE POSITIVE</span>
              <span className="text-2xl font-bold text-emerald-200">{cm.tp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Validation Leaderboard */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold font-display text-white">
                Validation Model Leaderboard
              </h3>
              <p className="text-xs text-slate-400">
                Ranked by F2-Score on validation split (n=1,911) from 01_dataset_inspection.ipynb
              </p>
            </div>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono-tech">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-2.5 pr-3">Model</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Precision</th>
                  <th className="py-2.5 px-3">Recall</th>
                  <th className="py-2.5 px-3">F2 Score</th>
                  <th className="py-2.5 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {analytics.model_leaderboard.map((row) => (
                  <tr
                    key={row.model}
                    className={row.selected ? 'bg-cyan-500/10 text-white' : 'text-slate-300'}
                  >
                    <td className="py-3 pr-3 font-semibold">{row.model}</td>
                    <td className="py-3 px-3">{row.threshold.toFixed(2)}</td>
                    <td className="py-3 px-3">{(row.precision * 100).toFixed(2)}%</td>
                    <td className="py-3 px-3">{(row.recall * 100).toFixed(2)}%</td>
                    <td className="py-3 px-3 font-bold text-cyan-300">
                      {row.f2_score.toFixed(4)}
                    </td>
                    <td className="py-3 pl-3">
                      {row.selected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Deployed
                        </span>
                      ) : (
                        <span className="text-slate-500">Benchmarked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 3: Feature Importance Chart + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold font-display text-white">
                Top 20 XGBoost Feature Importance
              </h3>
              <p className="text-xs text-slate-400">
                Direct values from feature_importance.csv (gain-weighted across 106 features)
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={top20Features}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  stroke="#94a3b8"
                  fontSize={10}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#0ea5e9',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                  {top20Features.map((entry, idx) => (
                    <Cell
                      key={entry.feature}
                      fill={idx < 3 ? '#f43f5e' : idx < 8 ? '#38bdf8' : '#0284c7'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Risk Distribution + Full Feature Importance Search */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <div>
              <h3 className="text-base font-semibold font-display text-white">
                Final Event Risk Distribution (log₁₀ P<sub>c</sub>)
              </h3>
              <p className="text-xs text-slate-400">
                11,942 early-window events · Crimson bars mark ≥ -6.0 high-risk threshold
              </p>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dataset_stats.final_risk_histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="min"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(v) => Number(v).toFixed(0)}
                  />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#0ea5e9',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {analytics.dataset_stats.final_risk_histogram.map((b) => (
                      <Cell
                        key={b.bin}
                        fill={b.is_high_risk ? '#f43f5e' : '#0ea5e9'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold font-display text-white">
                All 106 Feature Importance Scores
              </h3>
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fiQuery}
                  onChange={(e) => setFiQuery(e.target.value)}
                  placeholder="Search feature..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-7 pr-2 py-1 text-xs font-mono-tech text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs font-mono-tech">
              {filteredFeatures.map((f, i) => (
                <div
                  key={f.feature}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80"
                >
                  <span className="text-slate-200 truncate">
                    <span className="text-slate-500 mr-2">#{i + 1}</span>
                    {f.feature}
                  </span>
                  <span className="text-cyan-300 font-semibold">
                    {(f.importance * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
