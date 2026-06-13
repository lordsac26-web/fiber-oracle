import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Thermometer, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Flame, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/useIsAdmin';

// Monthly sub-windows for the warning phase chunking (Mar–Jun of current year)
function buildWarningChunks(windowStart, windowEnd) {
  // Parse boundaries
  const start = new Date(windowStart + 'T00:00:00');
  const end   = new Date(windowEnd   + 'T23:59:59');
  const chunks = [];

  // Walk month-by-month from start to end
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const chunkStart = new Date(Math.max(cursor.getTime(), start.getTime()));
    const monthEnd   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // last day of month
    const chunkEnd   = new Date(Math.min(monthEnd.getTime(), end.getTime()));

    chunks.push({
      sub_window_start: chunkStart.toISOString().slice(0, 10),
      sub_window_end:   chunkEnd.toISOString().slice(0, 10),
    });

    // Advance to next month
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return chunks;
}

const PHASE_LABELS = {
  idle:             { label: 'Ready',              color: 'bg-gray-100 text-gray-700' },
  creating_run:     { label: 'Initializing…',      color: 'bg-blue-100 text-blue-700' },
  phase_critical:   { label: 'Phase 1: Critical',  color: 'bg-orange-100 text-orange-700' },
  phase_warning:    { label: 'Phase 2: Warning',   color: 'bg-yellow-100 text-yellow-700' },
  completed:        { label: 'Completed',           color: 'bg-green-100 text-green-700' },
  failed:           { label: 'Failed',              color: 'bg-red-100 text-red-700' },
};

export default function ThermalAnalysis() {
  const { isAdmin } = useIsAdmin();

  // ── Form config ─────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [windowStart,      setWindowStart]      = useState(`${currentYear}-03-01`);
  const [windowEnd,        setWindowEnd]        = useState(new Date().toISOString().slice(0, 10));
  const [dropThreshold,    setDropThreshold]    = useState(2.5);
  const [baselineDays,     setBaselineDays]     = useState(7);
  const [tempThreshold,    setTempThreshold]    = useState(85);

  // ── Run state ────────────────────────────────────────────────────────────────
  const [phase,            setPhase]            = useState('idle');   // see PHASE_LABELS keys
  const [runId,            setRunId]            = useState(null);
  const [progress,         setProgress]         = useState({ step: 0, total: 0, label: '' });
  const [criticalResult,   setCriticalResult]   = useState(null);
  const [warningFindings,  setWarningFindings]  = useState([]);
  const [warningAlerts,    setWarningAlerts]    = useState(0);
  const [totalWarningFlagged, setTotalWarningFlagged] = useState(0);

  // ── Historical runs ──────────────────────────────────────────────────────────
  const { data: pastRuns = [], refetch: refetchRuns } = useQuery({
    queryKey: ['thermalRuns'],
    queryFn: () => base44.entities.ThermalAnalysisRun.list('-created_date', 10),
    staleTime: 60 * 1000,
  });

  // ── Orchestrator ─────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!isAdmin) return;

    // 1. Create the run record
    setPhase('creating_run');
    setProgress({ step: 0, total: 0, label: 'Creating run record…' });
    setCriticalResult(null);
    setWarningFindings([]);
    setWarningAlerts(0);
    setTotalWarningFlagged(0);

    let newRun;
    try {
      newRun = await base44.entities.ThermalAnalysisRun.create({
        window_start:      windowStart,
        window_end:        windowEnd,
        drop_threshold_db: dropThreshold,
        baseline_days:     baselineDays,
        status:            'running',
        records_scanned:   0,
        serials_analyzed:  0,
        flagged_count:     0,
        alerts_created:    0,
        warning_flagged_count:  0,
        warning_alerts_created: 0,
      });
      setRunId(newRun.id);
    } catch (err) {
      toast.error('Failed to create run record');
      setPhase('failed');
      return;
    }

    // 2. Phase 1 — critical
    setPhase('phase_critical');
    setProgress({ step: 1, total: 0, label: 'Scanning critical-status ONTs…' });

    let phase1Serials = [];
    try {
      const r1 = await base44.functions.invoke('analyzeThermalDegradation', {
        run_id:            newRun.id,
        phase:             'critical',
        window_start:      windowStart,
        window_end:        windowEnd,
        drop_threshold_db: dropThreshold,
        baseline_days:     baselineDays,
        temp_threshold_f:  tempThreshold,
      });
      const d1 = r1.data;
      if (!d1?.success) throw new Error(d1?.error || 'Phase 1 failed');

      phase1Serials = d1.phase1_flagged_serials || [];
      setCriticalResult(d1);
      setProgress({
        step: 1, total: 0,
        label: `Phase 1 done — ${d1.flagged_count} critical ONTs flagged, ${d1.alerts_created} alerts created`,
      });
    } catch (err) {
      toast.error(`Phase 1 failed: ${err.message}`);
      setPhase('failed');
      return;
    }

    // 3. Phase 2 — warning (monthly chunks)
    setPhase('phase_warning');
    const chunks = buildWarningChunks(windowStart, windowEnd);
    let accWarnedSerials = []; // accumulates across chunks for proper dedup
    let accFindings      = [];
    let accAlerts        = 0;
    let accFlagged       = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLast = i === chunks.length - 1;

      setProgress({
        step:  i + 1,
        total: chunks.length,
        label: `Warning phase: ${chunk.sub_window_start} → ${chunk.sub_window_end} (${i + 1}/${chunks.length})`,
      });

      try {
        const r2 = await base44.functions.invoke('analyzeThermalDegradation', {
          run_id:                  newRun.id,
          phase:                   'warning',
          window_start:            windowStart,
          window_end:              windowEnd,
          sub_window_start:        chunk.sub_window_start,
          sub_window_end:          chunk.sub_window_end,
          is_last_chunk:           isLast,
          drop_threshold_db:       dropThreshold,
          baseline_days:           baselineDays,
          temp_threshold_f:        tempThreshold,
          // Pass BOTH sets so backend skips already-handled serials
          phase1_flagged_serials:  phase1Serials,
          already_warned_serials:  accWarnedSerials,
        });

        const d2 = r2.data;
        if (!d2?.success) throw new Error(d2?.error || 'Warning chunk failed');

        // Accumulate deduplicated warned serials for next chunk
        // d2.warned_serials already excludes phase1 serials (backend does this)
        accWarnedSerials = d2.warned_serials || [];
        accFindings  = [...accFindings, ...(d2.warning_findings || [])];
        accAlerts   += d2.warning_alerts_created || 0;
        accFlagged  += d2.warning_flagged_count  || 0;

        // Update UI incrementally
        setWarningFindings([...accFindings]);
        setWarningAlerts(accAlerts);
        setTotalWarningFlagged(accFlagged);

      } catch (err) {
        toast.error(`Warning chunk ${i + 1}/${chunks.length} failed: ${err.message}`);
        setPhase('failed');
        return;
      }
    }

    setPhase('completed');
    setProgress({ step: chunks.length, total: chunks.length, label: 'Analysis complete' });
    toast.success(`Thermal analysis complete — ${phase1Serials.length} critical + ${accFlagged} warning precursors found`);
    refetchRuns();
  }, [isAdmin, windowStart, windowEnd, dropThreshold, baselineDays, tempThreshold, refetchRuns]);

  const isRunning = phase === 'creating_run' || phase === 'phase_critical' || phase === 'phase_warning';
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.idle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Thermometer className="h-5 w-5 text-orange-500" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Thermal Degradation Analysis</h1>
            <p className="text-xs text-gray-500">Detect heat-correlated ONT Rx drops across the fleet</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Config Card */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Analysis Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Window Start</label>
                <input
                  type="date"
                  value={windowStart}
                  onChange={e => setWindowStart(e.target.value)}
                  disabled={isRunning}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Window End</label>
                <input
                  type="date"
                  value={windowEnd}
                  onChange={e => setWindowEnd(e.target.value)}
                  disabled={isRunning}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Drop Threshold (dB)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={dropThreshold}
                  onChange={e => setDropThreshold(parseFloat(e.target.value))}
                  disabled={isRunning}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Baseline Days</label>
                <input
                  type="number"
                  step="1"
                  min="3"
                  max="30"
                  value={baselineDays}
                  onChange={e => setBaselineDays(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Temp Threshold (°F)</label>
                <input
                  type="number"
                  step="1"
                  min="70"
                  max="110"
                  value={tempThreshold}
                  onChange={e => setTempThreshold(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="w-full border rounded-md px-2 py-1.5 text-sm bg-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={runAnalysis}
                disabled={!isAdmin || isRunning}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Thermometer className="h-4 w-4 mr-2" />}
                {isRunning ? 'Running…' : 'Run Thermal Analysis'}
              </Button>
              <Badge className={phaseInfo.color}>{phaseInfo.label}</Badge>
              {!isAdmin && <span className="text-xs text-gray-400">Admin access required</span>}
            </div>
          </CardContent>
        </Card>

        {/* Progress Card (shown while running or after) */}
        {phase !== 'idle' && (
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-4">
              {/* Step progress bar */}
              {phase === 'phase_warning' && progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{progress.label}</span>
                    <span>{progress.step}/{progress.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.step / progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {(phase !== 'phase_warning') && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  {isRunning && <Loader2 className="h-4 w-4 animate-spin text-orange-500 shrink-0" />}
                  {phase === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                  {phase === 'failed'    && <AlertCircle  className="h-4 w-4 text-red-500 shrink-0"   />}
                  {progress.label}
                </p>
              )}

              {/* Live stats row */}
              {(criticalResult || totalWarningFlagged > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                  <StatPill label="Critical flagged"   value={criticalResult?.flagged_count   ?? 0} color="text-red-600"    icon={<AlertTriangle className="h-3 w-3" />} />
                  <StatPill label="Critical alerts"    value={criticalResult?.alerts_created  ?? 0} color="text-red-500"    icon={<AlertCircle className="h-3 w-3" />} />
                  <StatPill label="Warning precursors" value={totalWarningFlagged}                  color="text-yellow-600" icon={<Wind className="h-3 w-3" />} />
                  <StatPill label="Warning alerts"     value={warningAlerts}                        color="text-yellow-500" icon={<AlertCircle className="h-3 w-3" />} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Critical findings table */}
        {criticalResult?.findings?.length > 0 && (
          <FindingsTable
            title="Critical — Heat-Correlated Rx Drops"
            findings={criticalResult.findings}
            badgeColor="bg-red-100 text-red-700"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          />
        )}

        {/* Warning findings table */}
        {warningFindings.length > 0 && (
          <FindingsTable
            title="Warning — Pre-Critical Heat Precursors"
            findings={warningFindings}
            badgeColor="bg-yellow-100 text-yellow-700"
            icon={<Wind className="h-4 w-4 text-yellow-600" />}
          />
        )}

        {/* Past runs */}
        {pastRuns.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-700">Recent Runs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Window</th>
                      <th className="px-4 py-2 text-right">Critical</th>
                      <th className="px-4 py-2 text-right">Alerts</th>
                      <th className="px-4 py-2 text-right">Warning</th>
                      <th className="px-4 py-2 text-right">W.Alerts</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRuns.map(run => (
                      <tr key={run.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">
                          {run.created_date ? format(new Date(run.created_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap text-xs">
                          {run.window_start} → {run.window_end}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">{run.flagged_count ?? 0}</td>
                        <td className="px-4 py-2 text-right text-red-500">{run.alerts_created ?? 0}</td>
                        <td className="px-4 py-2 text-right font-semibold text-yellow-600">{run.warning_flagged_count ?? 0}</td>
                        <td className="px-4 py-2 text-right text-yellow-500">{run.warning_alerts_created ?? 0}</td>
                        <td className="px-4 py-2">
                          <Badge className={
                            run.status === 'completed' ? 'bg-green-100 text-green-700' :
                            run.status === 'failed'    ? 'bg-red-100 text-red-700'     :
                                                         'bg-blue-100 text-blue-700'
                          }>
                            {run.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, color, icon }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className={`flex items-center justify-center gap-1 font-bold text-xl ${color}`}>
        {icon}{value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function FindingsTable({ title, findings, badgeColor, icon }) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          <Badge className={badgeColor}>{findings.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 text-left">Serial</th>
                <th className="px-4 py-2 text-left">OLT</th>
                <th className="px-4 py-2 text-left">Event Date</th>
                <th className="px-4 py-2 text-right">Drop (dB)</th>
                <th className="px-4 py-2 text-right">High Temp °F</th>
                <th className="px-4 py-2 text-left">Address</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-800">{f.serial}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{f.olt}</td>
                  <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{f.event_date}</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">{f.drop_db}</td>
                  <td className="px-4 py-2 text-right text-orange-600">{f.high_temp_f ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{f.address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}