import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { BarChart3, Search, X } from 'lucide-react';

const STATUS_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  ok: 'bg-green-100 text-green-800 border-green-300',
  offline: 'bg-purple-100 text-purple-800 border-purple-300',
};

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
const MAX_COMPARE = 4;

export default function PeerComparisonChart({ currentOnt, peers }) {
  const [selectedSerials, setSelectedSerials] = useState(new Set());
  const [search, setSearch] = useState('');
  const [chartMode, setChartMode] = useState('bar'); // 'bar' or 'radar'

  const filteredPeers = useMemo(() => {
    if (!search) return peers;
    const term = search.toLowerCase();
    return peers.filter(p =>
      p.SerialNumber?.toLowerCase().includes(term) ||
      p.OntID?.toString().includes(search) ||
      p._subscriber?.name?.toLowerCase().includes(term)
    );
  }, [peers, search]);

  const togglePeer = (serial) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serial)) {
        next.delete(serial);
      } else if (next.size < MAX_COMPARE) {
        next.add(serial);
      }
      return next;
    });
  };

  // Build comparison dataset: current ONT + up to 4 selected peers
  const comparisonOnts = useMemo(() => {
    const selected = peers.filter(p => selectedSerials.has(p.SerialNumber));
    return [currentOnt, ...selected];
  }, [currentOnt, peers, selectedSerials]);

  const barData = useMemo(() => {
    const metrics = [
      { key: 'ONT Rx', accessor: o => parseFloat(o.OntRxOptPwr) || 0 },
      { key: 'OLT Rx', accessor: o => parseFloat(o.OLTRXOptPwr) || 0 },
      { key: 'ONT Tx', accessor: o => parseFloat(o.OntTxPwr) || 0 },
    ];
    return metrics.map(m => {
      const point = { name: m.key };
      comparisonOnts.forEach((o, i) => {
        const label = i === 0 ? 'This ONT' : `#${o.OntID || o.SerialNumber?.slice(-4)}`;
        point[label] = m.accessor(o);
      });
      return point;
    });
  }, [comparisonOnts]);

  const errorBarData = useMemo(() => {
    const metrics = [
      { key: 'US BIP', accessor: o => parseInt(o.UpstreamBipErrors) || 0 },
      { key: 'DS BIP', accessor: o => parseInt(o.DownstreamBipErrors) || 0 },
      { key: 'US FEC U', accessor: o => parseInt(o.UpstreamFecUncorrectedCodeWords) || 0 },
      { key: 'DS FEC U', accessor: o => parseInt(o.DownstreamFecUncorrectedCodeWords) || 0 },
      { key: 'US FEC C', accessor: o => parseInt(o.UpstreamFecCorrectedCodeWords) || 0 },
      { key: 'DS FEC C', accessor: o => parseInt(o.DownstreamFecCorrectedCodeWords) || 0 },
      { key: 'HEC', accessor: o => parseInt(o.UpstreamGemHecErrors) || 0 },
      { key: 'MBurst', accessor: o => parseInt(o.UpstreamMissedBursts) || 0 },
    ];
    return metrics.map(m => {
      const point = { name: m.key };
      comparisonOnts.forEach((o, i) => {
        const label = i === 0 ? 'This ONT' : `#${o.OntID || o.SerialNumber?.slice(-4)}`;
        point[label] = m.accessor(o);
      });
      return point;
    });
  }, [comparisonOnts]);

  // Radar chart data — normalize all metrics to 0-100 scale for visual comparison
  const radarData = useMemo(() => {
    const allOnts = [currentOnt, ...peers];
    const metricsRaw = [
      { key: 'ONT Rx', accessor: o => parseFloat(o.OntRxOptPwr) || 0, invert: false },
      { key: 'OLT Rx', accessor: o => parseFloat(o.OLTRXOptPwr) || 0, invert: false },
      { key: 'US BIP', accessor: o => parseInt(o.UpstreamBipErrors) || 0, invert: true },
      { key: 'DS BIP', accessor: o => parseInt(o.DownstreamBipErrors) || 0, invert: true },
      { key: 'FEC Unc', accessor: o => (parseInt(o.UpstreamFecUncorrectedCodeWords) || 0) + (parseInt(o.DownstreamFecUncorrectedCodeWords) || 0), invert: true },
      { key: 'MBurst', accessor: o => parseInt(o.UpstreamMissedBursts) || 0, invert: true },
    ];

    // Find min/max across all peers for each metric
    const ranges = metricsRaw.map(m => {
      const vals = allOnts.map(o => m.accessor(o));
      return { min: Math.min(...vals), max: Math.max(...vals) };
    });

    return metricsRaw.map((m, mi) => {
      const point = { metric: m.key };
      const { min, max } = ranges[mi];
      const range = max - min || 1;
      comparisonOnts.forEach((o, i) => {
        const raw = m.accessor(o);
        // Normalize to 0-100; for "invert" metrics, lower = better → higher score
        let score = ((raw - min) / range) * 100;
        if (m.invert) score = 100 - score;
        const label = i === 0 ? 'This ONT' : `#${o.OntID || o.SerialNumber?.slice(-4)}`;
        point[label] = Math.round(score);
      });
      return point;
    });
  }, [comparisonOnts, currentOnt, peers]);

  const legendKeys = comparisonOnts.map((o, i) =>
    i === 0 ? 'This ONT' : `#${o.OntID || o.SerialNumber?.slice(-4)}`
  );

  if (peers.length === 0) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Interactive Peer Comparison
            {selectedSerials.size > 0 && (
              <Badge variant="outline" className="text-xs">{selectedSerials.size}/{MAX_COMPARE} selected</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={chartMode === 'bar' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setChartMode('bar')}
            >Bar</Button>
            <Button
              variant={chartMode === 'radar' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setChartMode('radar')}
            >Radar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Peer selector */}
        <div className="border rounded-lg p-2 space-y-2 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder="Search peers by serial, ID, name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-7 h-7 text-xs"
              />
            </div>
            {selectedSerials.size > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedSerials(new Set())}>
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          <div className="max-h-32 overflow-y-auto divide-y">
            {filteredPeers.map((p, i) => {
              const checked = selectedSerials.has(p.SerialNumber);
              const disabled = !checked && selectedSerials.size >= MAX_COMPARE;
              return (
                <label
                  key={p.SerialNumber}
                  className={`flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-white rounded ${disabled ? 'opacity-40' : ''}`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => togglePeer(p.SerialNumber)}
                  />
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: checked ? CHART_COLORS[[...selectedSerials].indexOf(p.SerialNumber) + 1] : '#d1d5db' }}
                  />
                  <span className="font-mono w-8">#{p.OntID}</span>
                  <span className="font-mono flex-1 truncate">{p.SerialNumber}</span>
                  <span className="font-mono w-16 text-right">{p.OntRxOptPwr ?? '—'} dBm</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${STATUS_COLORS[p._analysis?.status] || ''}`}>
                    {p._analysis?.status}
                  </Badge>
                  {p._subscriber?.name && (
                    <span className="text-gray-500 truncate max-w-[80px]">{p._subscriber.name}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Charts — only render when at least one peer is selected */}
        {selectedSerials.size > 0 && (
          <>
            {chartMode === 'bar' ? (
              <div className="space-y-4">
                {/* Power Levels */}
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Optical Power (dBm)</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {legendKeys.map((key, i) => (
                        <Bar key={key} dataKey={key} fill={CHART_COLORS[i]} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Error Metrics */}
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">Error Metrics</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={errorBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {legendKeys.map((key, i) => (
                        <Bar key={key} dataKey={key} fill={CHART_COLORS[i]} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Health Score (higher = better)</div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    {legendKeys.map((key, i) => (
                      <Radar
                        key={key}
                        name={key}
                        dataKey={key}
                        stroke={CHART_COLORS[i]}
                        fill={CHART_COLORS[i]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <RechartsTooltip contentStyle={{ fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {selectedSerials.size === 0 && (
          <div className="text-center py-4 text-xs text-gray-500">
            Select up to {MAX_COMPARE} peers above to generate comparison charts
          </div>
        )}
      </CardContent>
    </Card>
  );
}