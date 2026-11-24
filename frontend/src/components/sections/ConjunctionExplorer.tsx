import React, { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  Brain,
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  Radar,
  Search,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../services/api';
import type {
  ConjunctionEvent,
  EventDetailResponse,
  EventsListResponse,
} from '../../types/orbital';

interface ConjunctionExplorerProps {
  onPredictEvent: (eventId: number) => void;
  onInspectInMonitor: (eventId: number) => void;
}

export const ConjunctionExplorer: React.FC<ConjunctionExplorerProps> = ({
  onPredictEvent,
  onInspectInMonitor,
}) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'low'>('all');
  const [objectType, setObjectType] = useState('all');
  const [maxMissDistance, setMaxMissDistance] = useState('');
  const [sortBy, setSortBy] = useState('final_risk');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<EventsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<EventDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getEvents({
        search: debouncedSearch || undefined,
        risk_filter: riskFilter,
        object_type: objectType,
        max_miss_distance: maxMissDistance ? Number(maxMissDistance) : undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: 20,
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load events');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, riskFilter, objectType, maxMissDistance, sortBy, sortDir, page]);

  const openDetail = async (ev: ConjunctionEvent) => {
    setDetailLoading(true);
    try {
      const detail = await api.getEventDetail(ev.event_id);
      setSelectedDetail(detail);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Event ID, Mission ID, or Object Type..."
            className="w-full rounded-xl bg-slate-950/80 border border-slate-700/70 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-cyan-400" />
          {(['all', 'high', 'low'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => {
                setRiskFilter(rf);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono-tech uppercase transition cursor-pointer ${
                riskFilter === rf
                  ? rf === 'high'
                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50'
                    : 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                  : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {rf === 'all' ? 'All Risk' : rf === 'high' ? 'High Risk' : 'Low Risk'}
            </button>
          ))}
        </div>

        <select
          value={objectType}
          onChange={(e) => {
            setObjectType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl bg-slate-950/80 border border-slate-700/70 px-3 py-2 text-xs font-mono-tech text-slate-200 focus:outline-none focus:border-cyan-400"
        >
          <option value="all">All Chaser Types</option>
          <option value="DEBRIS">DEBRIS</option>
          <option value="UNKNOWN">UNKNOWN</option>
          <option value="PAYLOAD">PAYLOAD</option>
          <option value="ROCKET BODY">ROCKET BODY</option>
          <option value="TBA">TBA</option>
        </select>

        <input
          type="number"
          value={maxMissDistance}
          onChange={(e) => {
            setMaxMissDistance(e.target.value);
            setPage(1);
          }}
          placeholder="Max miss (m)"
          className="w-32 rounded-xl bg-slate-950/80 border border-slate-700/70 px-3 py-2 text-xs font-mono-tech text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />

        <div className="ml-auto text-xs font-mono-tech text-slate-400 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          {data ? `${data.total.toLocaleString()} matching events` : 'Loading...'}
        </div>
      </div>

      {error && (
        <div className="glass-panel-danger rounded-xl p-4 text-sm text-rose-200">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Table */}
        <div
          className={`${
            selectedDetail ? 'xl:col-span-7' : 'xl:col-span-12'
          } glass-panel rounded-2xl overflow-hidden flex flex-col`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono-tech uppercase tracking-wider text-slate-400">
                  {[
                    ['event_id', 'Event ID'],
                    ['mission_id', 'Mission'],
                    ['c_object_type', 'Object'],
                    ['time_to_tca', 'TCA (d)'],
                    ['miss_distance', 'Miss Dist (m)'],
                    ['relative_speed', 'Rel Spd (m/s)'],
                    ['risk', 'Early Risk'],
                    ['final_risk', 'Final Risk'],
                  ].map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => col !== 'c_object_type' && toggleSort(col)}
                      className={`px-3.5 py-3 ${
                        col !== 'c_object_type'
                          ? 'cursor-pointer hover:text-cyan-300 select-none'
                          : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortBy === col && <ArrowDownUp className="w-3 h-3 text-cyan-400" />}
                      </span>
                    </th>
                  ))}
                  <th className="px-3.5 py-3">Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs font-mono-tech">
                {loading && !data ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      Querying ESA conjunction catalog...
                    </td>
                  </tr>
                ) : data && data.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                      No conjunction events match your current filters.
                    </td>
                  </tr>
                ) : (
                  data?.items.map((ev) => {
                    const isHR = ev.high_risk === 1;
                    const isSelected = selectedDetail?.summary.event_id === ev.event_id;
                    return (
                      <tr
                        key={ev.event_id}
                        onClick={() => openDetail(ev)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-cyan-500/15'
                            : isHR
                            ? 'bg-rose-950/15 hover:bg-rose-950/30'
                            : 'hover:bg-slate-900/70'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-semibold text-white">
                          EVT-{ev.event_id}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-300">M{ev.mission_id}</td>
                        <td className="px-3.5 py-2.5 text-slate-300">{ev.c_object_type}</td>
                        <td className="px-3.5 py-2.5 text-cyan-300">
                          {ev.time_to_tca.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-200">
                          {ev.miss_distance !== null ? ev.miss_distance.toLocaleString() : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-300">
                          {ev.relative_speed !== null ? ev.relative_speed.toLocaleString() : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-300">{ev.risk.toFixed(2)}</td>
                        <td
                          className={`px-3.5 py-2.5 font-semibold ${
                            isHR ? 'text-rose-400' : 'text-cyan-300'
                          }`}
                        >
                          {ev.final_risk.toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isHR
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {isHR ? 'HIGH RISK' : 'LOW RISK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && (
            <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs font-mono-tech text-slate-400">
              <span>
                Page {data.page} of {data.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Event Detail Inspector */}
        {selectedDetail && (
          <div className="xl:col-span-5 glass-panel rounded-2xl p-5 space-y-4 self-start">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono-tech uppercase tracking-widest text-cyan-300">
                  CDM Event Telemetry Dossier
                </span>
                <h3 className="text-xl font-bold font-display text-white">
                  Event #{selectedDetail.summary.event_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-xs font-mono-tech text-slate-400">
                Loading full 102-feature CDM record...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono-tech">
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                    <span className="text-slate-500 block">FINAL RISK</span>
                    <span
                      className={`text-sm font-bold ${
                        selectedDetail.summary.high_risk === 1 ? 'text-rose-400' : 'text-cyan-300'
                      }`}
                    >
                      {selectedDetail.summary.final_risk.toFixed(3)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                    <span className="text-slate-500 block">MAHALANOBIS</span>
                    <span className="text-sm font-semibold text-white">
                      {selectedDetail.summary.mahalanobis_distance?.toFixed(2) ?? '—'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                    <span className="text-slate-500 block">SPACE WEATHER</span>
                    <span className="text-sm font-semibold text-white">
                      F10 {selectedDetail.summary.F10 ?? '—'} / AP {selectedDetail.summary.AP ?? '—'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs font-mono-tech space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Apogee / Perigee:</span>
                    <span className="text-slate-200">
                      {selectedDetail.summary.t_h_apo?.toFixed(1) ?? '—'} /{' '}
                      {selectedDetail.summary.t_h_per?.toFixed(1) ?? '—'} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chaser Apogee / Perigee:</span>
                    <span className="text-slate-200">
                      {selectedDetail.summary.c_h_apo?.toFixed(1) ?? '—'} /{' '}
                      {selectedDetail.summary.c_h_per?.toFixed(1) ?? '—'} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RTN Relative Pos (m):</span>
                    <span className="text-slate-200">
                      {selectedDetail.rtn_vectors.relative_position_r?.toFixed(1) ?? '—'},{' '}
                      {selectedDetail.rtn_vectors.relative_position_t?.toFixed(1) ?? '—'},{' '}
                      {selectedDetail.rtn_vectors.relative_position_n?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RTN Relative Vel (m/s):</span>
                    <span className="text-slate-200">
                      {selectedDetail.rtn_vectors.relative_velocity_r?.toFixed(1) ?? '—'},{' '}
                      {selectedDetail.rtn_vectors.relative_velocity_t?.toFixed(1) ?? '—'},{' '}
                      {selectedDetail.rtn_vectors.relative_velocity_n?.toFixed(1) ?? '—'}
                    </span>
                  </div>
                </div>

                {selectedDetail.timeline.length > 0 && (
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                    <p className="text-xs font-mono-tech text-slate-300 mb-2">
                      CDM Risk Evolution ({selectedDetail.timeline.length} messages)
                    </p>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedDetail.timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis
                            dataKey="time_to_tca"
                            reversed
                            stroke="#64748b"
                            fontSize={10}
                            tickFormatter={(v) => `${Number(v).toFixed(1)}d`}
                          />
                          <YAxis stroke="#64748b" fontSize={10} domain={[-30, 0]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#020617',
                              borderColor: '#0ea5e9',
                              fontSize: '11px',
                            }}
                          />
                          <ReferenceLine y={-6} stroke="#f43f5e" strokeDasharray="4 4" />
                          <Line
                            type="monotone"
                            dataKey="risk"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={{ r: 2.5 }}
                            name="Risk (log10)"
                          />
                          <Line
                            type="monotone"
                            dataKey="max_risk_estimate"
                            stroke="#f59e0b"
                            strokeWidth={1.5}
                            dot={false}
                            name="Max Risk Est"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={() => onPredictEvent(selectedDetail.summary.event_id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 text-xs transition cursor-pointer"
                  >
                    <Brain className="w-4 h-4" />
                    Send All 102 Features to AI Predictor
                  </button>
                  <button
                    onClick={() => onInspectInMonitor(selectedDetail.summary.event_id)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-2.5 text-xs text-slate-200 transition cursor-pointer"
                  >
                    <Radar className="w-4 h-4" />
                    3D
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
